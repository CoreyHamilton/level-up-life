from sqlalchemy import Column, Integer, Float, Boolean, Date, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    goal_weight = Column(Float, nullable=True)
    start_weight = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    steps = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    ate_well = Column(Boolean, nullable=True)
    drank_alcohol = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())