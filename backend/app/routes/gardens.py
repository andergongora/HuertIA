from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Garden, Row, PlantType

router = APIRouter()


# --- Gardens ---

@router.post("/gardens", response_model=Garden, status_code=201)
def create_garden(garden: Garden, session: Session = Depends(get_session)):
    session.add(garden)
    session.commit()
    session.refresh(garden)
    return garden


@router.get("/gardens", response_model=list[Garden])
def list_gardens(session: Session = Depends(get_session)):
    return session.exec(select(Garden)).all()


@router.get("/gardens/{garden_id}", response_model=Garden)
def get_garden(garden_id: UUID, session: Session = Depends(get_session)):
    garden = session.get(Garden, garden_id)
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    return garden


@router.delete("/gardens/{garden_id}", status_code=204)
def delete_garden(garden_id: UUID, session: Session = Depends(get_session)):
    garden = session.get(Garden, garden_id)
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    session.delete(garden)
    session.commit()


# --- Rows ---

@router.post("/gardens/{garden_id}/rows", response_model=Row, status_code=201)
def create_row(garden_id: UUID, row: Row, session: Session = Depends(get_session)):
    if not session.get(Garden, garden_id):
        raise HTTPException(status_code=404, detail="Garden not found")
    row.garden_id = garden_id
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.get("/gardens/{garden_id}/rows", response_model=list[Row])
def list_rows(garden_id: UUID, session: Session = Depends(get_session)):
    rows = session.exec(select(Row).where(Row.garden_id == garden_id).order_by(Row.position)).all()
    return rows


@router.patch("/rows/{row_id}", response_model=Row)
def update_row(row_id: UUID, data: dict, session: Session = Depends(get_session)):
    row = session.get(Row, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")
    for key, value in data.items():
        if hasattr(row, key):
            setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.delete("/rows/{row_id}", status_code=204)
def delete_row(row_id: UUID, session: Session = Depends(get_session)):
    row = session.get(Row, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")
    session.delete(row)
    session.commit()


# --- Plant Types ---

@router.post("/plant-types", response_model=PlantType, status_code=201)
def create_plant_type(plant_type: PlantType, session: Session = Depends(get_session)):
    session.add(plant_type)
    session.commit()
    session.refresh(plant_type)
    return plant_type


@router.get("/plant-types", response_model=list[PlantType])
def list_plant_types(session: Session = Depends(get_session)):
    return session.exec(select(PlantType).order_by(PlantType.name)).all()


@router.get("/plant-types/{plant_type_id}", response_model=PlantType)
def get_plant_type(plant_type_id: UUID, session: Session = Depends(get_session)):
    pt = session.get(PlantType, plant_type_id)
    if not pt:
        raise HTTPException(status_code=404, detail="PlantType not found")
    return pt


@router.patch("/plant-types/{plant_type_id}", response_model=PlantType)
def update_plant_type(plant_type_id: UUID, data: dict, session: Session = Depends(get_session)):
    pt = session.get(PlantType, plant_type_id)
    if not pt:
        raise HTTPException(status_code=404, detail="PlantType not found")
    for key, value in data.items():
        if hasattr(pt, key):
            setattr(pt, key, value)
    session.add(pt)
    session.commit()
    session.refresh(pt)
    return pt
