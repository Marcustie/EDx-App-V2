import asyncio
import sys
import os

# Add platform_interface to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'platform_interface'))

from platform_interface.device.utils import ping_all_ports

async def test_scan():
    print("Scanning for XP2 devices...")
    
    def progress(status):
        current, total = status
        print(f"Progress: {current}/{total} ports scanned")
    
    devices = await ping_all_ports(progress)
    
    if devices:
        print(f"\n✓ Found {len(devices)} device(s):")
        for dev in devices:
            print(f"  - {dev.serial_number} on {dev.com_port}")
    else:
        print("\nNo XP2 devices found")
    
    return devices

if __name__ == "__main__":
    devices = asyncio.run(test_scan())
