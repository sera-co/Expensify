from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, timedelta
from collections import defaultdict
from typing import Optional
from pydantic import BaseModel

# Define models directly in main.py to avoid import issues
class Expense(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[date] = None

    class Config:
        arbitrary_types_allowed = True

class DateRequest(BaseModel):
    target_date: Optional[date] = None

    class Config:
        arbitrary_types_allowed = True

app = FastAPI(title="Smart Expense Tracker")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary in-memory data storage
expenses = []

# ------------------ ROUTES ------------------

@app.post("/add-expense")
def add_expense(expense: Expense):
    try:
        exp_data = expense.dict()
        if exp_data.get("date") is None:
            exp_data["date"] = date.today()
        expenses.append(exp_data)
        return {"message": "Expense added successfully!", "data": exp_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding expense: {str(e)}")

@app.post("/daily-expenses")
def get_daily_expenses(request: DateRequest):
    try:
        target_date = request.target_date or date.today()
        filtered = [exp for exp in expenses if exp["date"] == target_date]
        total = sum(exp["amount"] for exp in filtered)
        return {"date": target_date, "total": total, "expenses": filtered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving daily expenses: {str(e)}")

@app.post("/weekly-expenses")
def get_weekly_expenses(request: DateRequest):
    try:
        target_date = request.target_date or date.today()
        start_week = target_date - timedelta(days=target_date.weekday())
        end_week = start_week + timedelta(days=6)

        filtered = [exp for exp in expenses if start_week <= exp["date"] <= end_week]
        totals_by_category = defaultdict(float)
        for exp in filtered:
            totals_by_category[exp["category"]] += exp["amount"]

        return {
            "week_start": start_week,
            "week_end": end_week,
            "total": sum(totals_by_category.values()),
            "totals_by_category": totals_by_category,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving weekly expenses: {str(e)}")

@app.post("/monthly-expenses")
def get_monthly_expenses(request: DateRequest):
    try:
        target_date = request.target_date or date.today()
        filtered = [
            exp
            for exp in expenses
            if exp["date"].month == target_date.month and exp["date"].year == target_date.year
        ]

        totals_by_category = defaultdict(float)
        for exp in filtered:
            totals_by_category[exp["category"]] += exp["amount"]

        return {
            "month": target_date.strftime("%B %Y"),
            "total": sum(totals_by_category.values()),
            "totals_by_category": totals_by_category,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving monthly expenses: {str(e)}")

@app.get("/")
def root():
    return {"message": "Welcome to Expensify API"}

# Debug endpoint to see all expenses
@app.get("/all-expenses")
def get_all_expenses():
    return {"expenses": expenses}