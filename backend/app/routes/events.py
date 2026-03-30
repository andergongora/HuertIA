from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import PlantingEvent, Planting

router = APIRouter()


@router.post("/plantings/{planting_id}/events", response_model=PlantingEvent, status_code=201)
async def create_event(
    planting_id: UUID,
    event: PlantingEvent,
    session: Session = Depends(get_session),
):
    if not session.get(Planting, planting_id):
        raise HTTPException(status_code=404, detail="Planting not found")

    event.planting_id = planting_id

    # Process note with AI if present (graceful degradation on failure)
    if event.raw_note:
        try:
            from app.services.ai_processor import process_note
            planting = session.get(Planting, planting_id)
            result = await process_note(event.raw_note, planting, session)
            event.ai_summary = result.get("resumen")
            event.ai_tags = result.get("tags", [])
            event.ai_advice = result.get("consejo")
        except Exception:
            pass

    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.get("/plantings/{planting_id}/events", response_model=list[PlantingEvent])
def list_events(planting_id: UUID, session: Session = Depends(get_session)):
    if not session.get(Planting, planting_id):
        raise HTTPException(status_code=404, detail="Planting not found")
    events = session.exec(
        select(PlantingEvent)
        .where(PlantingEvent.planting_id == planting_id)
        .order_by(PlantingEvent.created_at)
    ).all()
    return events
