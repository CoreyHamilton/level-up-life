from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, logs

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

@app.get("/")
def root():
    return {"message": "Level Up Life API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}