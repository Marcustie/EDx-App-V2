import logging
import asyncio
import re
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

log = logging.getLogger(__name__)
router = APIRouter()

# Store WebSocket connections per device
device_connections: Dict[str, Set[WebSocket]] = {}

# Regex patterns for parsing device output
SCRIPT_POSITION_RE = re.compile(r'script-position\s+I\s+src=\S+,\s+line=(\d+)')
SCRIPT_OUTPUT_RE = re.compile(r'script-output\s+I\s+(.+)$')
SCRIPT_STATUS_RE = re.compile(r'script\s+I\s+(.+)$')
DATA_SAMPLE_RE = re.compile(r'Sample\[(\d+)\]\s*=\s*(-?\d+\.?\d*)')
TEMP_SENSOR_RE = re.compile(r'(ir[12]|temp).*?(-?\d+\.?\d+)')
MOTOR_RE = re.compile(r'motor\s+I\s+(.+)$')

class DeviceLogParser:
    '''Parse device output into structured events'''
    
    @staticmethod
    def parse(line: str) -> dict:
        '''Parse a device log line into a structured event'''
        
        # Script position (line tracking)
        match = SCRIPT_POSITION_RE.search(line)
        if match:
            return {
                'type': 'script-position',
                'line': int(match.group(1)),
                'raw': line
            }
        
        # Script output (print statements)
        match = SCRIPT_OUTPUT_RE.search(line)
        if match:
            return {
                'type': 'script-output',
                'message': match.group(1).strip(),
                'raw': line
            }
        
        # Script status
        match = SCRIPT_STATUS_RE.search(line)
        if match:
            return {
                'type': 'script-status',
                'message': match.group(1).strip(),
                'raw': line
            }
        
        # Data sample (chronoamperometry)
        match = DATA_SAMPLE_RE.search(line)
        if match:
            return {
                'type': 'data-sample',
                'index': int(match.group(1)),
                'value': float(match.group(2)),
                'raw': line
            }
        
        # Temperature sensor
        match = TEMP_SENSOR_RE.search(line.lower())
        if match:
            return {
                'type': 'temperature',
                'sensor': match.group(1),
                'value': float(match.group(2)),
                'raw': line
            }
        
        # Motor status
        match = MOTOR_RE.search(line)
        if match:
            return {
                'type': 'motor-status',
                'message': match.group(1).strip(),
                'raw': line
            }
        
        # Generic log line
        return {
            'type': 'log',
            'message': line.strip(),
            'raw': line
        }

@router.websocket('/ws/device/{serial_number}')
async def device_websocket(websocket: WebSocket, serial_number: str):
    '''WebSocket endpoint for real-time device data'''
    await websocket.accept()
    
    # Register this connection
    if serial_number not in device_connections:
        device_connections[serial_number] = set()
    device_connections[serial_number].add(websocket)
    
    log.info(f'WebSocket connected for device {serial_number}')
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Could handle client -> device commands here if needed
            log.debug(f'Received from client: {data}')
    except WebSocketDisconnect:
        device_connections[serial_number].remove(websocket)
        log.info(f'WebSocket disconnected for device {serial_number}')
        if not device_connections[serial_number]:
            del device_connections[serial_number]

async def broadcast_to_device(serial_number: str, event: dict):
    '''Broadcast an event to all connected WebSocket clients for a device'''
    if serial_number not in device_connections:
        return
    
    message = json.dumps(event)
    disconnected = set()
    
    for websocket in device_connections[serial_number]:
        try:
            await websocket.send_text(message)
        except Exception as e:
            log.error(f'Error sending to WebSocket: {e}')
            disconnected.add(websocket)
    
    # Clean up disconnected clients
    for ws in disconnected:
        device_connections[serial_number].discard(ws)

class DeviceWebSocketCallback:
    '''Callback that parses device output and broadcasts via WebSocket'''
    
    def __init__(self, serial_number: str):
        self.serial_number = serial_number
        self.parser = DeviceLogParser()
    
    def __call__(self, message: str):
        '''Called for each line from device'''
        # Parse the message
        event = self.parser.parse(message)
        event['serial_number'] = self.serial_number
        event['timestamp'] = asyncio.get_event_loop().time()
        
        # Broadcast to WebSocket clients
        asyncio.create_task(broadcast_to_device(self.serial_number, event))
