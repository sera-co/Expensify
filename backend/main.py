from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import Base, ExpenseRecord, engine, get_db


class Expense(BaseModel):
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)  # reject 0 and negative amounts
    description: Optional[str] = None
    date: Optional[date] = None


class DateRequest(BaseModel):
    target_date: Optional[date] = None


app = FastAPI(title="Smart Expense Tracker")

# Create tables on startup if they don't exist yet
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ HELPERS ------------------

def category_totals(db: Session, start: date, end: date) -> dict:
    """Sum of amounts per category for start <= date <= end."""
    rows = db.execute(
        select(ExpenseRecord.category, func.sum(ExpenseRecord.amount))
        .where(ExpenseRecord.date >= start, ExpenseRecord.date <= end)
        .group_by(ExpenseRecord.category)
    ).all()
    totals = defaultdict(float)
    for category, amount in rows:
        totals[category] = amount or 0.0
    return totals


# ------------------ ROUTES ------------------

@app.post("/add-expense")
def add_expense(expense: Expense, db: Session = Depends(get_db)):
    try:
        record = ExpenseRecord(
            category=expense.category,
            amount=expense.amount,
            description=expense.description,
            date=expense.date or date.today(),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"message": "Expense added successfully!", "data": record.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding expense: {str(e)}")


@app.post("/daily-expenses")
def get_daily_expenses(request: DateRequest, db: Session = Depends(get_db)):
    try:
        target_date = request.target_date or date.today()
        records = db.scalars(
            select(ExpenseRecord)
            .where(ExpenseRecord.date == target_date)
            .order_by(ExpenseRecord.created_at)
        ).all()
        total = sum(r.amount for r in records)
        return {
            "date": target_date,
            "total": total,
            "expenses": [r.to_dict() for r in records],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving daily expenses: {str(e)}")


@app.post("/weekly-expenses")
def get_weekly_expenses(request: DateRequest, db: Session = Depends(get_db)):
    try:
        target_date = request.target_date or date.today()
        start_week = target_date - timedelta(days=target_date.weekday())  # Monday
        end_week = start_week + timedelta(days=6)  # Sunday

        totals = category_totals(db, start_week, end_week)
        return {
            "week_start": start_week,
            "week_end": end_week,
            "total": sum(totals.values()),
            "totals_by_category": totals,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving weekly expenses: {str(e)}")


@app.post("/monthly-expenses")
def get_monthly_expenses(request: DateRequest, db: Session = Depends(get_db)):
    try:
        target_date = request.target_date or date.today()
        month_start = target_date.replace(day=1)
        # First day of next month minus one day = last day of this month
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        month_end = next_month - timedelta(days=1)

        totals = category_totals(db, month_start, month_end)
        return {
            "month": target_date.strftime("%B %Y"),
            "total": sum(totals.values()),
            "totals_by_category": totals,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving monthly expenses: {str(e)}")


@app.get("/")
def root():
    return {"message": "Welcome to Expensify API"}


# Debug endpoint to see all expenses (will be removed/protected once auth is added)
@app.get("/all-expenses")
def get_all_expenses(db: Session = Depends(get_db)):
    records = db.scalars(select(ExpenseRecord).order_by(ExpenseRecord.id)).all()
    return {"expenses": [r.to_dict() for r in records]}