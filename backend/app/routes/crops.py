from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Planting, PlantingStatus

router = APIRouter()


@router.post("/plantings", response_model=Planting, status_code=201)
def create_planting(planting: Planting, session: Session = Depends(get_session)):
    session.add(planting)
    session.commit()
    session.refresh(planting)
    return planting


@router.get("/plantings", response_model=list[Planting])
def list_plantings(
    garden_id: UUID | None = None,
    status: PlantingStatus | None = None,
    session: Session = Depends(get_session),
):
    query = select(Planting)
    if garden_id:
        query = query.where(Planting.garden_id == garden_id)
    if status:
        query = query.where(Planting.status == status)
    return session.exec(query).all()


@router.get("/plantings/{planting_id}", response_model=Planting)
def get_planting(planting_id: UUID, session: Session = Depends(get_session)):
    planting = session.get(Planting, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    return planting


@router.patch("/plantings/{planting_id}", response_model=Planting)
def update_planting(planting_id: UUID, data: dict, session: Session = Depends(get_session)):
    planting = session.get(Planting, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    for key, value in data.items():
        if hasattr(planting, key):
            setattr(planting, key, value)
    session.add(planting)
    session.commit()
    session.refresh(planting)
    return planting


@router.delete("/plantings/{planting_id}", status_code=204)
def delete_planting(planting_id: UUID, session: Session = Depends(get_session)):
    planting = session.get(Planting, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    session.delete(planting)
    session.commit()
