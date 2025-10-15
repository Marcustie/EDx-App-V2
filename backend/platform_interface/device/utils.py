import asyncio
import logging
import re

from pydantic import BaseModel
from serial.serialutil import SerialException
from serial.tools.list_ports import comports

from platform_interface.config import settings
from platform_interface.device import Device
from platform_interface.device.s3_upload import S3Uploader

log = logging.getLogger(__name__)

VERSION_RE = re.compile("Instrument-Version: (?P<version>.*)\n")
SERIAL_RE = re.compile("Instrument-Serial: (?P<serial_number>.*)\n")


class DeviceConnectionError(Exception):
    pass


class AvailableDevice(BaseModel):
    serial_number: str
    com_port: str

    def __str__(self) -> str:
        return f"{self.serial_number} ({self.com_port})"


class DeviceLogger:
    def __init__(self, serial):
        self.logger = logging.getLogger(f"{__name__}.{serial}")
        self._assay_file_handler = None
        self._serial = serial

    def __call__(self, message: str):
        self.logger.debug(message)

    def add_handler(self, handler: logging.Handler):
        self.logger.addHandler(handler)

    def remove_handler(self, handler: logging.Handler):
        self.logger.removeHandler(handler)

    def add_assay_file_handler(self, log_name: str):
        if not self._assay_file_handler:
            handler = logging.FileHandler(log_name, mode="a")
            handler.setFormatter(logging.Formatter(settings.assay_file_log_format))
            self._assay_file_handler = handler
            self.logger.addHandler(handler)
        else:
            raise ValueError("Already logging!")  # todo: better

    def remove_assay_file_handler(self):
        if self._assay_file_handler:
            # Get the file path from the handler before removing it
            file_path = self._assay_file_handler.baseFilename

            # Remove the handler
            self.logger.removeHandler(self._assay_file_handler)
            self._assay_file_handler = None

            # Upload the file to S3 if AWS credentials are configured
            if (
                settings.aws_access_key_id
                and settings.aws_secret_access_key
                and settings.aws_s3_bucket
            ):
                try:
                    uploader = S3Uploader()
                    uploader.upload_file(file_path, settings.aws_s3_bucket)
                    log.info(
                        "Assay log file %s uploaded to S3 bucket %s",
                        file_path,
                        settings.aws_s3_bucket,
                    )
                except Exception as e:
                    log.exception("Failed to upload assay log file to S3: %s", e)


async def ping(port: str):
    try:
        device = Device(port=port, baudrate=settings.baudrate)
        await device.connect()
    except Exception:
        try:
            await device.disconnect()
        except Exception:
            pass
        log.exception("Failed to connect to %s", port)
        raise DeviceConnectionError(f"Failed to connect to {port}")
    try:
        lines = await device.send_command("!identify", wait_for_error=True, timeout=2)
    except asyncio.TimeoutError:
        device.stop_read_loop()
        await device.disconnect()
        raise DeviceConnectionError(f"Failed to connect to {port}")
    try:
        device.stop_read_loop()
        await device.disconnect()
    except Exception:
        log.exception("Failed to disconnect from %s", port)
        raise DeviceConnectionError(f"Failed to disconnect from {port}")
    try:
        serial_number = parse_serial(lines)
        return serial_number
    except Exception:
        log.exception("Failed to parse serial number from %s", lines)
        raise DeviceConnectionError("Failed to parse serial number")


async def ping_all_ports(progress_callback: callable) -> list[AvailableDevice]:
    devices = []
    try:
        ports = comports()
    except Exception:
        log.exception("error getting comports, see log for details")
        raise

    if ports:
        total_devices = len(ports)
        log.info("ports to scan: %s", [p.device for p in ports])
    else:
        log.warning("no ports to scan")
        return []

    for i, port in enumerate(ports):
        try:
            device = await ping(port.device)
            if device:
                devices.append(
                    AvailableDevice(serial_number=device, com_port=port.device)
                )
        except SerialException:
            log.info("serial connection failed on port %s", port.device)
        except asyncio.TimeoutError:
            log.info("timeout on port %s", port.device)
        except DeviceConnectionError:
            log.warning("could not connect to device on %s", port.device)
        except Exception:
            log.exception(
                "unknown error while pinging %s, see log for details", port.device
            )

        progress_callback((i, total_devices))
    progress_callback((i + 1, total_devices))
    return devices


def parse_serial(response: list[str]) -> str:
    line_string = "\n".join(response)
    try:
        instrument_version = VERSION_RE.search(line_string)["version"].strip()
        instrument_serial = SERIAL_RE.search(line_string)["serial_number"].strip()
        return f"{instrument_version}-{instrument_serial}"
    except KeyError:
        log.debug("Could not parse instrument serial from response: %s", response)
        return ""


async def connect_device(available_device: AvailableDevice):
    log.debug("making device")
    try:
        device = Device(
            port=available_device.com_port,
            baudrate=115200,
            callback=DeviceLogger(available_device.serial_number),
        )

        log.debug("made device")
    except Exception:
        log.exception("unhandled exception while connecting to device")
        raise DeviceConnectionError(f"Failed to connect to {available_device}")
    try:
        await device.connect()
    except Exception:
        log.exception("error while connecting device")
        raise DeviceConnectionError(f"Failed to connect to {available_device}")
    log.debug("connected device")
    try:
        lines = await device.send_command("!identify", wait_for_error=True)
    except asyncio.TimeoutError:
        log.warning("timeout while attempting to connect to %s", device)
        device.stop_read_loop()
        await device.disconnect()
        raise DeviceConnectionError(f"Failed to connect to {available_device}")
    except Exception:
        try:
            device.stop_read_loop()
            await device.disconnect()
        except Exception:
            pass
        log.exception("error while connecting to device")
        raise DeviceConnectionError(f"Failed to connect to {available_device}")

    try:
        serial_number = parse_serial(lines)
        if serial_number != available_device.serial_number:
            raise DeviceConnectionError("Device ID changed on serial port")
        device.serial_number = serial_number
        log.debug("set serial")
    except Exception:
        log.exception("unhandled exception while getting serial number")
        raise DeviceConnectionError(f"Failed to connect to {available_device}")

    return device
