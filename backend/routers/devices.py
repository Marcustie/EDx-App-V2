import logging
import asyncio
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from platform_interface.device.utils import ping_all_ports, connect_device, AvailableDevice

log = logging.getLogger(__name__)
router = APIRouter(prefix="/devices", tags=["devices"])

# Store connected devices
connected_devices: Dict[str, any] = {}

@router.get("/scan")
async def scan_devices() -> List[Dict]:
    '''Scan for available XP2 devices connected via USB'''
    try:
        def progress(status):
            current, total = status
            log.info(f"Scanning: {current}/{total} ports")
        
        devices = await ping_all_ports(progress)
        result = [{"serial_number": d.serial_number, "com_port": d.com_port} for d in devices]
        log.info(f"Found {len(devices)} device(s)")
        return result
    except Exception as e:
        log.error(f"Error scanning for devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connect")
async def connect_to_device(com_port: str, serial_number: str) -> Dict:
    '''Connect to a specific device'''
    try:
        # Import WebSocket callback
        from routers.websocket import DeviceWebSocketCallback
        
        # Check if already connected
        if serial_number in connected_devices:
            return {"status": "already_connected", "serial_number": serial_number}
        
        # Create AvailableDevice and connect with WebSocket callback
        available_device = AvailableDevice(serial_number=serial_number, com_port=com_port)
        
        # Create device with WebSocket callback
        from platform_interface.device.utils import DeviceLogger
        
        # Create a combined callback that logs AND broadcasts to WebSocket
        device_logger = DeviceLogger(serial_number)
        ws_callback = DeviceWebSocketCallback(serial_number)
        
        def combined_callback(message: str):
            device_logger(message)  # Log it
            ws_callback(message)     # Broadcast to WebSocket
        
        # Manually create device with combined callback
        from platform_interface.device import Device
        device = Device(
            port=com_port,
            baudrate=115200,
            callback=combined_callback
        )
        
        await device.connect()
        
        # Send identify to set serial number
        lines = await device.send_command("!identify", wait_for_error=True)
        device.serial_number = serial_number
        
        # Store the connected device
        connected_devices[serial_number] = device
        
        log.info(f"Connected to device {serial_number} on {com_port}")
        return {"status": "connected", "serial_number": serial_number, "com_port": com_port}
    except Exception as e:
        log.error(f"Error connecting to device: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connected")
async def list_connected_devices() -> List[Dict]:
    '''List all connected devices'''
    return [
        {"serial_number": device.serial_number, "com_port": device.port}
        for device in connected_devices.values()
    ]
@router.post("/command/{serial_number}")
async def send_command(serial_number: str, command: str, wait_for_response: bool = True) -> Dict:
    '''Send a command to a connected device'''
    try:
        if serial_number not in connected_devices:
            raise HTTPException(status_code=404, detail="Device not connected")
        
        device = connected_devices[serial_number]
        
        if wait_for_response:
            lines = await device.send_command(command, wait_for_error=True, timeout=5)
            return {
                "status": "success",
                "command": command,
                "response": lines
            }
        else:
            await device.write(command)
            return {
                "status": "sent",
                "command": command
            }
    except Exception as e:
        log.error(f"Error sending command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect/{serial_number}")
async def disconnect_device(serial_number: str) -> Dict:
    '''Disconnect from a specific device'''
    try:
        if serial_number not in connected_devices:
            raise HTTPException(status_code=404, detail="Device not connected")
        
        device = connected_devices[serial_number]
        await device.disconnect()
        del connected_devices[serial_number]
        
        log.info(f"Disconnected from device {serial_number}")
        return {"status": "disconnected", "serial_number": serial_number}
    except Exception as e:
        log.error(f"Error disconnecting device: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-script/{serial_number}")
async def upload_script(serial_number: str, script: str) -> Dict:
    '''Upload a Lua script to the device'''
    try:
        if serial_number not in connected_devices:
            raise HTTPException(status_code=404, detail="Device not connected")
        
        device = connected_devices[serial_number]
        device.upload_script(script)
        
        log.info(f"Script uploaded to device {serial_number}")
        return {
            "status": "uploaded",
            "serial_number": serial_number
        }
    except Exception as e:
        log.error(f"Error uploading script: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-script/{serial_number}")
async def run_script(serial_number: str, metadata: str = "") -> Dict:
    '''Run the uploaded script on the device'''
    try:
        if serial_number not in connected_devices:
            raise HTTPException(status_code=404, detail="Device not connected")
        
        device = connected_devices[serial_number]
        run_info = {"target": serial_number, "metadata": metadata}
        device.run_script(run_info)
        
        log.info(f"Script started on device {serial_number}")
        return {
            "status": "running",
            "serial_number": serial_number
        }
    except Exception as e:
        log.error(f"Error running script: {e}")
        raise HTTPException(status_code=500, detail=str(e))
