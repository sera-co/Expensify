from collections import defaultdict
from datetime import date, timedelta
from datetime import date as DateType
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import Base, ExpenseRecord, UserRecord, engine, get_db


class Expense(BaseModel):
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)  # reject 0 and negative amounts
    description: Optional[str] = None
    date: Optional[DateType] = None


class DateRequest(BaseModel):
    target_date: Optional[DateType] = None


def _clean_username(value: str) -> str:
    return value.strip().lower()


class RegisterRequest(BaseModel):
    username: str = Field(max_length=50)
    # bcrypt only uses the first 72 bytes, so cap the length
    password: str = Field(min_length=6, max_length=72)

    @field_validator("username")
    @classmethod
    def check_username(cls, v: str) -> str:
        v = _clean_username(v)
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def clean(cls, v: str) -> str:
        return _clean_username(v)


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

def category_totals(db: Session, user_id: int, start: date, end: date) -> dict:
    """Sum of this user's amounts per category for start <= date <= end."""
    rows = db.execute(
        select(ExpenseRecord.category, func.sum(ExpenseRecord.amount))
        .where(
            ExpenseRecord.user_id == user_id,
            ExpenseRecord.date >= start,
            ExpenseRecord.date <= end,
        )
        .group_by(ExpenseRecord.category)
    ).all()
    totals = defaultdict(float)
    for category, amount in rows:
        totals[category] = amount or 0.0
    return totals


def token_response(user: UserRecord) -> dict:
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "username": user.username,
    }


# ------------------ AUTH ROUTES ------------------

@app.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(UserRecord).where(UserRecord.username == data.username)):
        raise HTTPException(status_code=409, detail="That username is already taken")
    user = UserRecord(username=data.username, password_hash=hash_password(data.password))
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken")
    return token_response(user)


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(UserRecord).where(UserRecord.username == data.username))
    # Same message for unknown user and wrong password so usernames can't be probed
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return token_response(user)


@app.get("/me")
def me(user: UserRecord = Depends(get_current_user)):
    return {"id": user.id, "username": user.username}


# ------------------ EXPENSE ROUTES (all require login) ------------------

@app.post("/add-expense")
def add_expense(
    expense: Expense,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    try:
        record = ExpenseRecord(
            user_id=user.id,
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
def get_daily_expenses(
    request: DateRequest,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    try:
        target_date = request.target_date or date.today()
        records = db.scalars(
            select(ExpenseRecord)
            .where(ExpenseRecord.user_id == user.id, ExpenseRecord.date == target_date)
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
def get_weekly_expenses(
    request: DateRequest,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    try:
        target_date = request.target_date or date.today()
        start_week = target_date - timedelta(days=target_date.weekday())  # Monday
        end_week = start_week + timedelta(days=6)  # Sunday

        totals = category_totals(db, user.id, start_week, end_week)
        return {
            "week_start": start_week,
            "week_end": end_week,
            "total": sum(totals.values()),
            "totals_by_category": totals,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving weekly expenses: {str(e)}")


@app.post("/monthly-expenses")
def get_monthly_expenses(
    request: DateRequest,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    try:
        target_date = request.target_date or date.today()
        month_start = target_date.replace(day=1)
        # First day of next month minus one day = last day of this month
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        month_end = next_month - timedelta(days=1)

        totals = category_totals(db, user.id, month_start, month_end)
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


# Debug endpoint: now only returns the logged-in user's own expenses
@app.get("/all-expenses")
def get_all_expenses(
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    records = db.scalars(
        select(ExpenseRecord).where(ExpenseRecord.user_id == user.id).order_by(ExpenseRecord.id)
    ).all()
    return {"expenses": [r.to_dict() for r in records]}


# ------------------ EDIT / DELETE (owner only) ------------------

def _get_owned_expense(db: Session, expense_id: int, user: UserRecord) -> ExpenseRecord:
    record = db.get(ExpenseRecord, expense_id)
    # 404 (not 403) for other people's expenses so ids can't be probed
    if record is None or record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return record


@app.put("/expenses/{expense_id}")
def update_expense(
    expense_id: int,
    expense: Expense,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    record = _get_owned_expense(db, expense_id, user)
    try:
        record.category = expense.category
        record.amount = expense.amount
        record.description = expense.description
        if expense.date is not None:  # keep the existing date unless a new one is sent
            record.date = expense.date
        db.commit()
        db.refresh(record)
        return {"message": "Expense updated successfully!", "data": record.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating expense: {str(e)}")


@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: UserRecord = Depends(get_current_user),
):
    record = _get_owned_expense(db, expense_id, user)
    try:
        db.delete(record)
        db.commit()
        return {"message": "Expense deleted successfully!", "id": expense_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting expense: {str(e)}")