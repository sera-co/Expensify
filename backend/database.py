from datetime import date, datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# Store the SQLite file next to this script so it works no matter where uvicorn is started from
DB_PATH = Path(__file__).resolve().parent / "expensify.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False is needed because FastAPI may use different threads per request
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ExpenseRecord(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(100))
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    # Real time the expense was recorded
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category": self.category,
            "amount": self.amount,
            "description": self.description,
            "date": self.date,
            "created_at": self.created_at,
        }


def get_db():
    """FastAPI dependency that opens a DB session per request and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()