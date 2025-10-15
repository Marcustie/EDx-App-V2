"""
Device communication module for the platform interface.

This module provides classes and functions for communicating with serial devices.
It includes:
- Protocol implementation for serial communication
- Device class for managing connections and sending/receiving data
- Script upload and execution functionality
- Automatic reconnection on connection loss
- Error handling and reporting

The module is designed to work with asyncio for non-blocking I/O operations.
"""

import asyncio
import base64
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, TYPE_CHECKING

import serial_asyncio
from serial.serialutil import SerialException

from platform_interface.config import settings
from platform_interface.device.events import Event, EventType, event_bus
from platform_interface.device.s3_upload import gui_logger
from platform_interface.worker import Worker, WorkerError

if TYPE_CHECKING:
    from platform_interface.device.utils import DeviceLogger

log = logging.getLogger(__name__)

ERROR_CODE_RE = re.compile(r"@\d+$")
DATA_PRINT_RE = re.compile(r"%Sample\[(-?\d+\.?\d*)\]\s*=\s*(-?\d+\.?\d*)$")
DATA_RESET_RE = re.compile(r"%Sample\[clear\]$")
DATA_ADD_RE = re.compile(r"%Sample\[add\]$")


class SerialDeviceProtocol(asyncio.Protocol):
    """
    Protocol implementation for serial device communication.

    This class implements the asyncio Protocol interface for serial communication.
    It handles data reception, connection events, and automatic reconnection
    when a connection is lost unexpectedly.
    """

    def __init__(self, read_queue: asyncio.Queue, device=None):
        """
        Initialize the serial protocol.

        Args:
            read_queue: Queue where received data will be placed
            device: Optional reference to the parent Device object for reconnection
        """
        self.read_queue = read_queue
        self.transport = None
        self.device = device

    def connection_made(self, transport):
        """
        Called when a connection is established.

        This method is called by asyncio when the serial connection is established.
        It stores the transport object for later use.

        Args:
            transport: The transport object representing the connection
        """
        self.transport = transport
        log.debug("serial connection made")

    def data_received(self, data: bytes):
        """
        Called when data is received from the serial port.

        This method is called by asyncio when data is received. It places
        the data in the read queue for processing by the Device class.

        Args:
            data: The bytes received from the serial port
        """
        print(data.replace(b"\x1b[32m", b"").replace(b"\x1b[0m", b""))
        print(data.decode("utf-8"))
        self.read_queue.put_nowait(
            data.replace(b"\x1b[32m", b"").replace(b"\x1b[0m", b"")
        )

    def connection_lost(self, exc):
        """
        Called when the connection is lost or closed.

        This method is called by asyncio when the connection is lost or closed.
        If the connection was not intentionally closed, it schedules a reconnection
        attempt after a delay.

        Args:
            exc: The exception causing the connection loss, or None if closed cleanly
        """
        log.debug("serial connection lost: %s", exc)
        # Clear the transport reference to prevent phantom connections
        self.transport = None

        if self.device:
            if not self.device.intentional_disconnect:
                gui_logger.warning(
                    "Connection to %s lost, attempting re-connect in 5 seconds...",
                    self.device,
                )
                log.debug("scheduling reconnection in 5 seconds")
                asyncio.create_task(self._reconnect_after_delay())
            else:
                log.debug("not reconnecting due to intentional disconnect")
        else:
            log.debug("not reconnecting as no device reference is available")

    async def _reconnect_after_delay(self):
        """
        Attempt to reconnect to the device after a delay.

        This method waits for a specified delay and then attempts to reconnect
        to the device if the disconnection was not intentional.
        """
        await asyncio.sleep(5)
        if self.device and not self.device.intentional_disconnect:
            log.debug("attempting to reconnect to %s", self.device)
            try:
                # First, ensure any existing connection is properly closed
                if self.device.transport or self.device.protocol:
                    log.debug("cleaning up old connection before reconnecting")
                    # Set intentional_disconnect to True temporarily to prevent recursive reconnection
                    old_intentional_disconnect = self.device.intentional_disconnect
                    self.device.intentional_disconnect = True
                    await self.device.disconnect()
                    self.device.intentional_disconnect = old_intentional_disconnect

                # Now reconnect
                await self.device.connect()
                log.debug("reconnection successful")
                gui_logger.info("reconnected to %s!", self.device)
            except Exception as e:
                log.error("reconnection failed: %s", e)
                gui_logger.warning("reconnection to %s failed", self.device)


class Device:
    """
    Class for managing communication with a serial device.

    This class provides high-level functionality for connecting to, communicating with,
    and managing a serial device. It handles connection management, data sending and
    receiving, script uploading and execution, and error handling.

    The class uses asyncio for non-blocking I/O operations and provides both
    synchronous and asynchronous interfaces for various operations.
    """

    def __init__(
        self,
        port: str,
        baudrate: int = 115200,
        loop: asyncio.AbstractEventLoop = None,
        encoding: str = "utf-8",
        callback: Optional["DeviceLogger"] = None,
    ):
        """
        Initialize a Device instance.

        Args:
            port: The serial port to connect to (e.g., 'COM3', '/dev/ttyUSB0')
            baudrate: The baud rate for the serial connection
            loop: Optional asyncio event loop to use
            encoding: Character encoding for string/bytes conversion
            callback: Optional callback for logging device messages
        """
        self.port = port
        self.baudrate = baudrate
        self.loop = loop or asyncio.get_event_loop()
        self.transport = None
        self.protocol = None
        self.read_queue = asyncio.Queue()
        self.line_queue = asyncio.Queue()
        self.reading_task = None
        self.script_task = None
        self.encoding = encoding
        self.callback = callback
        self.serial_number = ""
        self.intentional_disconnect = False

        self._legacy_console = None

    def __str__(self) -> str:
        """
        Return a string representation of the device.

        Returns:
            str: A string containing the device's serial number and port
        """
        return "device %s (%s)" % (self.serial_number, self.port)

    async def connect(self):
        """
        Connect to the serial device.

        This method establishes a connection to the serial device specified by
        the port and baudrate. If a connection already exists, it is properly
        closed before establishing a new one.

        The method sets up the serial connection using asyncio and creates
        a SerialDeviceProtocol instance to handle the communication. It also
        starts a read loop to continuously process incoming data.

        Raises:
            SerialException: If there's an error with the serial port
            Exception: For other connection errors
        """
        try:
            log.debug("connecting to device")
            self.intentional_disconnect = False

            # Check if we already have a connection and clean it up if needed
            if self.transport or self.protocol:
                log.debug("existing connection found, cleaning up before reconnecting")
                # Set intentional_disconnect to True temporarily to prevent recursive reconnection
                old_intentional_disconnect = self.intentional_disconnect
                self.intentional_disconnect = True
                await self.disconnect()
                self.intentional_disconnect = old_intentional_disconnect

            # Create a new read_queue to avoid phantom data from previous connection
            self.read_queue = asyncio.Queue()
            self.line_queue = asyncio.Queue()

            (
                self.transport,
                self.protocol,
            ) = await serial_asyncio.create_serial_connection(
                self.loop,
                lambda: SerialDeviceProtocol(self.read_queue, self),
                self.port,
                baudrate=self.baudrate,
            )
            log.debug("Connected to device on %s", self.port)
        except SerialException:
            log.exception("Serial Exception")
            raise
        except Exception:
            log.exception("Connection error")
            raise
        self.start_read_loop(self.callback)
        log.debug("started reading")

    async def disconnect(self):
        """
        Disconnect from the serial device.

        This method closes the connection to the serial device by closing
        the transport. It sets the intentional_disconnect flag to True to
        prevent automatic reconnection attempts.

        The method is safe to call even if there is no active connection.
        """
        if self.transport:
            log.debug("closing transport")
            self.intentional_disconnect = True
            self.transport.close()
            self.transport = None
            self.protocol = None
            log.debug("Disconnected from device.")

        if self.reading_task:
            log.debug("finishing reading task")
            self.reading_task.cancel()
            try:
                await self.reading_task
            except asyncio.CancelledError:
                pass
            self.reading_task = None
            log.debug("reading task canceled")

        # Clear any pending data in the queues
        while not self.read_queue.empty():
            try:
                self.read_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

        while not self.line_queue.empty():
            try:
                self.line_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def write(self, data_str: str):
        """
        Write data to the serial device.

        This method sends a string to the device, automatically appending a newline
        character and encoding the string to bytes using UTF-8.

        Args:
            data_str: The string data to send to the device

        Raises:
            ConnectionError: If the device is not connected
        """
        data = (data_str + "\n").encode("utf-8")
        if self.transport:
            self.transport.write(data)
            log.debug("sent: %s", data)
        else:
            raise ConnectionError("Device not connected.")

    async def read(self) -> bytes:
        """
        Read raw data from the device.

        This method waits for and returns the next chunk of data from the device.
        It blocks until data is available.

        Returns:
            bytes: The raw data received from the device
        """
        data = await self.read_queue.get()
        return data

    async def read_lines(self, callback=None):
        """
        Continuously read and process lines from the device.

        This method continuously reads data from the device, accumulating it until
        a newline character is found. For each complete line, it:
        1. Adds the line to the line_queue for later retrieval
        2. Calls the callback function if provided
        3. Logs the line if no callback is provided

        The method handles both synchronous and asynchronous callbacks.

        Args:
            callback: Optional function to call with each complete line
        """
        buffer = ""
        while True:
            data = await self.read()  # Wait for incoming bytes.
            try:
                text = data.decode(self.encoding, errors="backslashreplace")
            except UnicodeDecodeError as e:
                log.warning("recv: %s", e)
                continue
            buffer += text
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                await self.line_queue.put(line)
                if callback:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(line)
                    else:
                        callback(line)
                else:
                    log.debug("recv: %s", line)

    def start_read_loop(self, callback=None):
        """
        Start the background task that continuously reads and processes complete lines.

        This method creates an asyncio task that runs the read_lines method in the
        background, allowing the application to continue running while data is
        processed asynchronously. If a read loop is already running, this method
        does nothing.

        Args:
            callback: Optional function to call with each complete line
        """
        if not self.reading_task:
            self.reading_task = asyncio.create_task(self.read_lines(callback))

    def stop_read_loop(self):
        """
        Stop the background read loop task.

        This method cancels the read_lines task if it's running. It's important
        to call this method before disconnecting from the device to ensure proper
        cleanup of resources.
        """
        if self.reading_task:
            self.reading_task.cancel()
            self.reading_task = None

    async def send_command(
        self, command: str, wait_for_error: bool = False, timeout: float = 10.0
    ) -> list[str]:
        """
        Send a command to the device and optionally wait for a response.

        This method sends a command to the device and can optionally wait for
        and collect the response. If wait_for_error is True, it will:
        1. Clear any pending data in the line queue
        2. Send the command
        3. Collect all lines received until an error code is detected or timeout occurs

        An error code is a line starting with '@' followed by an integer.

        Args:
            command: The command string to send to the device
            wait_for_error: Whether to wait for and collect the response
            timeout: Maximum time (in seconds) to wait for a response

        Returns:
            list[str]: Lines received in response to the command (empty if wait_for_error is False)

        Raises:
            asyncio.TimeoutError: If waiting for the response times out
            ConnectionError: If the device is not connected
        """
        # Flush any stale lines from the queue.
        while not self.line_queue.empty():
            try:
                self.line_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

        await self.write(command)

        if not wait_for_error:
            return []

        collected_lines = []
        try:
            while True:
                line = await asyncio.wait_for(self.line_queue.get(), timeout=timeout)
                collected_lines.append(line)

                if self._legacy_console is None:
                    split_line = line.strip().split("\t")
                    if len(split_line) >= 3:
                        self._legacy_console = False
                    else:
                        self._legacy_console = True
                if self._legacy_console:
                    pass
                else:
                    split_line = line.strip().split("\t")
                    # tstamp = line[0]
                    # module = line[1]
                    # severity = line[2]
                    line = "\t".join(split_line[3:])
                # Check for commands starting with %
                if line and line[0] == "%":
                    # Check for reset command
                    reset_match = DATA_RESET_RE.match(line)
                    if reset_match:
                        # Publish reset event
                        asyncio.create_task(
                            event_bus.publish(
                                Event(
                                    type=EventType.DATA_RESET,
                                    device_id=self.serial_number,
                                )
                            )
                        )
                        log.debug(
                            f"Reset event published for device: {self.serial_number}"
                        )

                    # Check for add command
                    add_match = DATA_ADD_RE.match(line)
                    if add_match:
                        # Publish add dataset event
                        asyncio.create_task(
                            event_bus.publish(
                                Event(
                                    type=EventType.DATA_ADD_DATASET,
                                    device_id=self.serial_number,
                                )
                            )
                        )
                        log.debug(
                            f"Add dataset event published for device: {self.serial_number}"
                        )

                    # Check for data print lines
                    data_match = DATA_PRINT_RE.match(line)
                    if data_match:
                        try:
                            x_value = float(data_match.group(1))
                            y_value = float(data_match.group(2))
                            # Publish data point event
                            asyncio.create_task(
                                event_bus.publish(
                                    Event(
                                        type=EventType.DATA_POINT,
                                        device_id=self.serial_number,
                                        data=(x_value, y_value),
                                    )
                                )
                            )
                            log.debug(
                                f"Data point event published: {self.serial_number}, {x_value}, {y_value}"
                            )
                        except (ValueError, IndexError) as e:
                            log.warning(
                                f"Failed to parse data point: {line}, error: {e}"
                            )

                # Check for error code lines (starting with @)
                if ERROR_CODE_RE.search(line):
                    break
        except asyncio.TimeoutError:
            raise asyncio.TimeoutError("Timed out waiting for error code")
        return collected_lines

    def remove_all_handlers(self):
        """Remove all handlers from a logger."""
        handlers = self.callback.logger.handlers.copy()

        for handler in handlers:
            self.callback.logger.removeHandler(handler)

    def upload_script(self, script):
        worker = Worker(
            fn=self._upload_script_call,
            setup_fn=self._upload_script_setup,
            error_fn=self._upload_script_error,
            finished_fn=self._upload_finished,
            script=script,
        )
        worker.start()

    def _upload_script_error(self, error: WorkerError):
        log.error(error)
        gui_logger.error("UPLOAD ERROR: script upload was not complete on %s", self)
        gui_logger.warning("Suggest power cycling device, then re-connecting")

    def _upload_script_setup(self):
        """Set up for script upload and publish script started event."""
        # Publish script started event
        asyncio.create_task(
            event_bus.publish(
                Event(type=EventType.SCRIPT_STARTED, device_id=self.serial_number)
            )
        )

    async def _upload_script_call(self, script):
        try:
            b64_script = encode_and_split(script)
            await self.send_command("!gpbuf_clear 0", wait_for_error=True)
            for line in b64_script:
                await asyncio.sleep(0.05)
                await self.send_command(f"!gpbuf_append 0 {line}", wait_for_error=True)
            await asyncio.sleep(0.05)
            await self.send_command("!gpbuf_clear 1", wait_for_error=True)
            await asyncio.sleep(0.05)
            resp = await self.send_command("!gpbuf_line_join 0 1", wait_for_error=True)
            if "@0" not in resp[-1]:
                log.warning("b64 not decoded, falling back to regular upload...")
                raise Exception("b64 not decoded, falling back to regular upload...")
            await asyncio.sleep(0.05)
            await self.send_command("!gpbuf_base64_decode 1 0", wait_for_error=True)
            await asyncio.sleep(0.05)
            await self.send_command("!gpbuf_print 0", wait_for_error=True)

        except Exception:  # TODO: check that this actually handles properly
            script_lines = script.split("\n")
            await self.send_command("!gpbuf_clear 0", wait_for_error=True)
            for line in script_lines:
                if line:
                    await self.send_command(
                        f"!gpbuf_append 0 {line}", wait_for_error=True
                    )
                else:
                    log.warning("stripped blank line from script")

    def _upload_finished(self):
        """Handle script upload completion and publish script completed event."""
        # Publish script completed event
        asyncio.create_task(
            event_bus.publish(
                Event(type=EventType.SCRIPT_COMPLETED, device_id=self.serial_number)
            )
        )
        log.info("upload finished on %s", self)

    def run_script(self, run_info: dict):
        # Check if there is an ID in run info, skip if not there
        if "target" in run_info:
            if self.serial_number != run_info["target"]:
                return
        worker = Worker(
            self._run_script_call,
            setup_fn=self._run_script_setup,
            result_fn=self._script_result,
            finished_fn=self._script_finished,
        )
        self._run_info = run_info
        worker.start()

    def reset(self):
        """
        Cancel any running script tasks.
        This is called when the reset button is pressed.
        """
        log.info("Resetting device %s", self)
        if self.script_task and not self.script_task.done():
            log.info("Cancelling script task on %s", self)
            self.script_task.cancel()
            self.script_task = None
        # Call script_finished to clean up
        asyncio.create_task(self._script_finished())

    async def _run_script_setup(self):
        """
        Set up for script execution and publish script started event.

        This method:
        1. Publishes a script started event
        2. Creates a log file for the script run
        3. Sets up the callback handler for the log file

        Raises:
            Exception: If there's an error creating the log file
        """
        # Publish script started event
        await event_bus.publish(
            Event(type=EventType.SCRIPT_STARTED, device_id=self.serial_number)
        )

        try:
            now = datetime.now()
            timestamp = now.strftime("%Y%m%dT%H%M%S")
            date_dir = now.strftime("%Y-%m-%d")
            log_dir = Path(settings.assay_log_root) / date_dir
            log_dir.mkdir(parents=True, exist_ok=True)
            filename = log_dir / f"{timestamp}_{self.serial_number}_assay.log"
            self.callback.add_assay_file_handler(str(filename))
            log.info("logging to %s", filename)
        except Exception:
            log.exception("failed to create run log")
            try:
                await self._script_finished()
            except Exception:
                pass
            raise  # TODO: this is not caught and causes a crash

    async def _run_script_call(self):
        self.callback("SCRIPT_RUN_START")
        self.callback(f"metadata={self._run_info['metadata']}")
        await self.send_command("!gpbuf_print 0", wait_for_error=True, timeout=10)
        # Store the task so it can be cancelled if needed
        self.script_task = asyncio.create_task(
            self.send_command(
                "!script_run_gpbuf 0",
                wait_for_error=True,
                timeout=settings.script_timeout,
            )
        )
        try:
            response = await self.script_task
            self.script_task = None
            await asyncio.sleep(0.1)
            return response
        except asyncio.CancelledError:
            log.info("Script task cancelled on %s", self)
            return None

    def _script_result(self, lines: list[str] | None):
        if not lines:
            log.warning("no lines received from script")
            return
        log.info("script complete with error code %s on %s", lines[-1], self)

    async def _script_finished(self):
        """
        Handle script execution completion.

        This method:
        1. Publishes a script completed event
        2. Logs the script run end
        3. Removes the assay file handler
        """
        # Publish script completed event
        await event_bus.publish(
            Event(type=EventType.SCRIPT_COMPLETED, device_id=self.serial_number)
        )

        self.callback("SCRIPT_RUN_END")
        await asyncio.sleep(0.1)
        self.callback.remove_assay_file_handler()
        log.info("script finished on %s", self)


def encode_and_split(input_string, chunk_size=76):
    encoded_bytes = base64.b64encode(input_string.encode("utf-8"))
    encoded_string = encoded_bytes.decode("utf-8")
    chunks = [
        encoded_string[i : i + chunk_size]
        for i in range(0, len(encoded_string), chunk_size)
    ]
    return chunks
