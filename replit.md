# EDx Lab Platform - Replit Project

## Project Overview

EDx Lab Platform is a modern web-based laboratory data platform for controlling ElectraDx XP2 electrochemical biosensor instruments. The system enables USB-connected device control, Lua script execution, real-time data streaming, and comprehensive test management for FDA Class II medical device compliance.

**Status**: Active Development  
**Last Updated**: October 15, 2025

---

## Architecture

### Technology Stack

**Backend:**
- Python 3.11
- FastAPI (REST API framework)
- Uvicorn (ASGI server)
- pyserial-asyncio (USB device communication)
- WebSockets (real-time data streaming)
- boto3 (AWS S3 integration)
- PyQt6 (GUI components for legacy desktop app)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Wouter (routing)
- shadcn/ui (component library)
- Tailwind CSS (styling)
- Recharts (data visualization)
- Lucide React (icons)

### System Architecture

```
Frontend (React) ←→ Backend (FastAPI) ←→ XP2 Devices (USB)
     ↓                    ↓                     ↓
  Port 5000         Port 8000              Serial USB
                        ↓
                   AWS S3 (Logs)
```

---

## Project Structure

```
.
├── backend/
│   ├── main.py                    # FastAPI application entry
│   ├── routers/
│   │   ├── devices.py            # Device management endpoints
│   │   └── websocket.py          # WebSocket streaming
│   ├── platform_interface/       # Device communication layer
│   │   ├── device/              # USB serial device handling
│   │   ├── gui/                 # PyQt6 GUI (legacy)
│   │   └── worker.py            # Background workers
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/             # shadcn/ui base components
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── DataChart.tsx
│   │   │   ├── ScriptEditor.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Instruments.tsx
│   │   │   ├── DeviceDetail.tsx
│   │   │   └── Scripts.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useTheme.ts
│   │   ├── services/
│   │   │   └── api.ts           # Backend API client
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── replit.md
```

---

## Features

### Completed Features ✅

**Backend Infrastructure:**
- USB device scanning and connection management
- Device command interface (send raw commands)
- Script upload with base64 encoding
- Script execution control
- Real-time WebSocket data streaming
- Multi-client WebSocket support
- Event parsing (position, output, data, temperature, motor)

**Frontend:**
- Dashboard with device statistics
- Instruments page with device grid
- Device detail page with tabbed interface:
  - Control tab (script upload/run, live data chart)
  - Script tab (editor with line highlighting)
  - Info tab (device information)
- Scripts page (placeholder UI)
- Dark/Light mode theme toggle
- Responsive design (mobile to desktop)
- Real-time WebSocket integration
- Live data visualization with Recharts

### Pending Features 🔄

**Backend (Not Yet Implemented):**
- Stop/Interrupt endpoint (emergency stop)
- Device status endpoint (multi-device monitoring)
- Script library management (CRUD operations)
- Temperature polling service
- Run history system
- Data export (CSV)
- Device telemetry tracking

**Frontend (Future Enhancements):**
- Script library integration (when backend is ready)
- Advanced metadata management
- Multi-device orchestration UI
- LabGuru ELN integration

---

## API Endpoints

### Device Management

```
GET  /devices/scan                          # Scan for USB devices
POST /devices/connect?com_port=&serial=     # Connect device
GET  /devices/connected                     # List connected devices
POST /devices/disconnect/{serial}           # Disconnect device
POST /devices/command/{serial}              # Send raw command
POST /devices/upload-script/{serial}        # Upload Lua script
POST /devices/run-script/{serial}           # Execute script
```

### WebSocket

```
ws://localhost:8000/ws/device/{serial}      # Real-time events
```

**Event Types:**
- `script-position` - Current line during execution
- `script-output` - Print statements from script
- `data-sample` - Chronoamperometry data
- `temperature` - IR sensor readings
- `motor-status` - Motor movement updates
- `log` - General device logs

---

## Running the Application

### Development Mode

Both workflows are already configured in Replit:

1. **Backend API** (localhost:8000)
   ```bash
   python backend/main.py
   ```

2. **Frontend** (0.0.0.0:5000)
   ```bash
   cd frontend && npm run dev
   ```

The frontend is accessible through the Replit webview on port 5000.

### Manual Commands

```bash
# Backend
python backend/main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Configuration

### Backend Configuration

The backend reads configuration from:
- `backend/platform_interface/config.py`
- Environment variables (`.env` file)

**Key Settings:**
- `baudrate`: 115200 (device serial baud rate)
- `script_timeout`: 3600 seconds
- `auto_connect`: True (auto-connect on startup)

### Frontend Configuration

- **Port**: 5000 (configured in `vite.config.ts`)
- **Host**: 0.0.0.0 (allows Replit proxy)
- **API Base URL**: http://localhost:8000

---

## Deployment

The project is configured for Replit deployment using the `autoscale` target:

**Build Command:**
```bash
npm run build --prefix frontend
```

**Run Command:**
```bash
python backend/main.py & cd frontend && npm run preview -- --host 0.0.0.0 --port 5000
```

The deployment:
- Builds the optimized frontend bundle
- Runs the backend API on port 8000
- Serves the frontend on port 5000
- Both processes run in parallel

---

## Theme Support

The application supports both light and dark themes:

- **Light Mode** (default): Professional medical device aesthetic
- **Dark Mode**: High contrast for low-light environments

Users can toggle between themes using the moon/sun icon in the top-right corner. Theme preference is persisted in localStorage.

---

## WebSocket Integration

The frontend uses a custom `useWebSocket` hook with:

- **Auto-reconnection** with exponential backoff (250ms → 5s)
- **Event buffering** (last 300 data points for charts)
- **Multiple event types** support
- **Connection status** indicator

Example usage:
```typescript
const { events, isConnected, clearEvents } = useWebSocket(serialNumber);
```

---

## Device Communication Protocol

**Command Format:**
```
!<command_name> [args]
```

**Response Format:**
```
<timestamp>  <subsystem>  <level>  <message>
@<error_code>
```

**Script Upload Process:**
1. Base64 encode script content
2. Split into 76-character chunks
3. Clear buffer: `!gpbuf_clear 0`
4. Upload chunks: `!gpbuf_append 0 <chunk>`
5. Join lines: `!gpbuf_line_join 0 1`
6. Decode: `!gpbuf_base64_decode 1 0`
7. Execute: `!script_run_gpbuf 0`

---

## User Preferences

No specific user preferences have been configured yet. As development continues, preferences will be documented here.

---

## Recent Changes

### October 15, 2025
- ✅ Initialized React + TypeScript frontend with Vite
- ✅ Installed all required dependencies (Wouter, Tailwind, Recharts, shadcn/ui)
- ✅ Built core UI components and page layouts
- ✅ Implemented dark/light theme toggle
- ✅ Configured WebSocket integration
- ✅ Set up deployment configuration
- ✅ Backend running on localhost:8000
- ✅ Frontend running on port 5000
- ✅ Fixed CORS settings for Replit proxy
- ✅ Created comprehensive documentation

### Next Steps
- Implement backend stop/interrupt endpoint
- Add device status monitoring
- Build script library management system
- Implement temperature polling service
- Add run history tracking
- Test with physical XP2 devices

---

## Troubleshooting

### Frontend Issues

**Blank page:**
- Check browser console for errors
- Verify both workflows are running
- Restart Frontend workflow

**API connection errors:**
- Ensure Backend API workflow is running
- Check that backend is on localhost:8000
- Verify CORS settings allow all origins

### Backend Issues

**Device connection failures:**
- Verify USB device is connected
- Check COM port availability
- Ensure correct baudrate (115200)

**PyQt6 errors:**
- Required system dependency: zstd
- Already installed in this Replit environment

---

## Contributing

When making changes:

1. Update this `replit.md` with new features/preferences
2. Test both frontend and backend workflows
3. Verify WebSocket connections work
4. Check responsive design on mobile/desktop
5. Update API documentation if endpoints change

---

## Support

For issues or questions:
- Check the PRD: `attached_assets/PRD_*.md`
- Review API documentation above
- Check browser console for frontend errors
- Review workflow logs for backend errors
