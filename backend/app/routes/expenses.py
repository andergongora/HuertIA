from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Expense

router = APIRouter()


@router.post("/expenses", response_model=Expense, status_code=201)
def create_expense(expense: Expense, session: Session = Depends(get_session)):
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


@router.get("/expenses", response_model=list[Expense])
def list_expenses(
    garden_id: UUID | None = None,
    category: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    session: Session = Depends(get_session),
):
    query = select(Expense)
    if garden_id:
        query = query.where(Expense.garden_id == garden_id)
    if category:
        query = query.where(Expense.category == category)
    if from_date:
        query = query.where(Expense.date >= from_date)
    if to_date:
        query = query.where(Expense.date <= to_date)
    return session.exec(query.order_by(Expense.date.desc())).all()


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: UUID, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()
