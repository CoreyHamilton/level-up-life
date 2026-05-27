import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, logs
from .database import engine
from .telemetry import setup_telemetry

logger = logging.getLogger("leveluplife")
logger.setLevel(logging.INFO)

app = FastAPI(title="Level Up Life API", version="0.1.0")

# Allow the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # We'll lock this down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(logs.router)

setup_telemetry(app, engine)

@app.get("/")
def root():
    logger.info("Root endpoint called")
    return {"message": "Level Up Life API is running"}

@app.get("/health")
def health_check():
    logger.info("Health check called")
    return {"status": "healthy"}
