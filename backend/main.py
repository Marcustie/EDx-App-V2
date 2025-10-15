import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import devices, websocket

# Set up basic logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title='EDx Device API')

# CORS for Replit environment - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(devices.router)
app.include_router(websocket.router)

@app.get('/')
async def root():
    return {'message': 'EDx Device API is running'}

@app.get('/health')
async def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
