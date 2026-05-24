from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse
import hashlib

router = APIRouter(prefix="/users", tags=["users"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(
        username=user.username,
        password_hash=hash_password(user.password),
        goal_weight=user.goal_weight,
        start_weight=user.start_weight
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or db_user.password_hash != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Login successful",
        "user_id": db_user.id,
        "username": db_user.username,
        "start_weight": db_user.start_weight,
        "goal_weight": db_user.goal_weight,
    }
