from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from ..database import get_db
from ..models import DailyLog
from ..schemas import DailyLogCreate, DailyLogResponse

router = APIRouter(prefix="/logs", tags=["logs"])

@router.post("/{user_id}", response_model=DailyLogResponse)
def create_log(user_id: int, log: DailyLogCreate, db: Session = Depends(get_db)):
    existing = db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.date == log.date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Log already exists for this date")
    
    db_log = DailyLog(user_id=user_id, **log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/{user_id}", response_model=List[DailyLogResponse])
def get_logs(user_id: int, db: Session = Depends(get_db)):
    return db.query(DailyLog).filter(DailyLog.user_id == user_id).all()

@router.get("/{user_id}/week", response_model=List[DailyLogResponse])
def get_week(user_id: int, db: Session = Depends(get_db)):
    seven_days_ago = date.today() - timedelta(days=7)
    return db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.date >= seven_days_ago
    ).all()

@router.put("/{user_id}/{log_date}", response_model=DailyLogResponse)
def update_log(user_id: int, log_date: date, log: DailyLogCreate, db: Session = Depends(get_db)):
    db_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.date == log_date
    ).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    for key, value in log.dict().items():
        setattr(db_log, key, value)
    
    db.commit()
    db.refresh(db_log)
    return db_log