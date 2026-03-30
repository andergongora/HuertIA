import json
import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.config import settings
from app.models import Garden, Planting, PlantType, PlantingEvent

router = APIRouter()

SYSTEM_PROMPT = """Eres un agrónomo experto especializado en horticultura mediterránea, \
con amplio conocimiento en cultivos de huerta, fitosanitarios, riego, suelos y temporadas. \
Respondes en español, de forma concisa y práctica. \
Cuando el usuario te da contexto sobre su huerta, úsalo para personalizar tus respuestas. \
Si no tienes contexto suficiente para dar una respuesta segura, dilo claramente."""


class ChatMessage(BaseModel):
    message: str
    garden_id: str | None = None


class ChatResponse(BaseModel):
    reply: str


def _build_context(garden_id: str, session: Session) -> str:
    garden = session.get(Garden, garden_id)
    if not garden:
        return ""

    plantings = session.exec(
        select(Planting).where(Planting.garden_id == garden_id)
    ).all()

    plant_type_ids = {p.plant_type_id for p in plantings}
    plant_types = {
        pt.id: pt
        for pt in session.exec(select(PlantType).where(PlantType.id.in_(plant_type_ids))).all()
    } if plant_type_ids else {}

    # Last 3 events per planting
    recent_events: list[PlantingEvent] = []
    for p in plantings:
        evs = session.exec(
            select(PlantingEvent)
            .where(PlantingEvent.planting_id == p.id)
            .order_by(PlantingEvent.created_at.desc())
            .limit(3)
        ).all()
        recent_events.extend(evs)

    lines = [f"Huerta: {garden.name}"]

    active = [p for p in plantings if p.status == "active"]
    if active:
        lines.append("Cultivos activos:")
        for p in active:
            pt = plant_types.get(p.plant_type_id)
            name = f"{pt.name}{f' ({pt.variety})' if pt and pt.variety else ''}" if pt else "desconocido"
            lines.append(f"  - {name}, plantado {p.planted_at}, origen: {p.origin}")

    if recent_events:
        lines.append("Eventos recientes:")
        for ev in sorted(recent_events, key=lambda e: e.created_at, reverse=True)[:5]:
            p = next((x for x in plantings if x.id == ev.planting_id), None)
            pt = plant_types.get(p.plant_type_id) if p else None
            name = f"{pt.name}" if pt else "cultivo"
            note = ev.ai_summary or ev.raw_note or ev.event_type
            lines.append(f"  - [{ev.created_at.date()}] {name}: {note}")

    return "\n".join(lines)


def _call_cli(system: str, message: str) -> str:
    """Llama a claude CLI con suscripción Pro. Bloquea hasta obtener respuesta."""
    result = subprocess.run(
        [
            "claude", "-p", message,
            "--system-prompt", system,
            "--output-format", "json",
            "--bare",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Error en claude CLI")
    data = json.loads(result.stdout)
    return data["result"]


def _call_api(system: str, message: str) -> str:
    """Llama a Anthropic API con API key."""
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    msg = client.messages.create(
        model=settings.ai_model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": message}],
    )
    return msg.content[0].text


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatMessage, session: Session = Depends(get_session)):
    if settings.ai_backend == "api" and not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="API key de IA no configurada.")

    context = _build_context(body.garden_id, session) if body.garden_id else ""
    system = SYSTEM_PROMPT
    if context:
        system += f"\n\nContexto actual del usuario:\n{context}"

    try:
        if settings.ai_backend == "cli":
            reply = _call_cli(system, body.message)
        else:
            reply = _call_api(system, body.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(reply=reply)
