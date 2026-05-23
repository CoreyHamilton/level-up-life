from pydantic import BaseModel
from datetime import date
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str
    goal_weight: Optional[float] = None
    start_weight: Optional[float] = None

class UserResponse(BaseModel):
    id: int
    username: str
    goal_weight: Optional[float] = None
    start_weight: Optional[float] = None

    class Config:
        from_attributes = True

class DailyLogCreate(BaseModel):
    date: date
    steps: Optional[int] = None
    weight: Optional[float] = None
    ate_well: Optional[bool] = None
    drank_alcohol: Optional[bool] = None

class DailyLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    steps: Optional[int] = None
    weight: Optional[float] = None
    ate_well: Optional[bool] = None
    drank_alcohol: Optional[bool] = None

    class Config:
        from_attributes = True