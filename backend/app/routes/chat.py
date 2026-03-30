import asyncio
import json
import subprocess
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.config import settings
from app.models import Garden, Planting, PlantType, PlantingEvent

router = APIRouter()

SYSTEM_PROMPT = """Eres un agrónomo experto especializado en horticultura mediterránea, \
con amplio conocimiento en cultivos de huerta, fitosanitarios, riego, suelos y temporadas. \
Respondes en español, de forma concisa y práctica. Usa listas y negritas cuando ayuden a la claridad. \
Cuando el usuario te da contexto sobre su huerta, úsalo para personalizar tus respuestas. \
Si no tienes contexto suficiente para dar una respuesta segura, dilo claramente."""


class ChatMessage(BaseModel):
    message: str
    garden_id: str | None = None


class ChatResponse(BaseModel):
    reply: str


class ConversationMessage(BaseModel):
    role: str    # 'user' | 'assistant'
    content: str


class StreamChatRequest(BaseModel):
    messages: list[ConversationMessage]
    garden_id: str | None = None


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


def _call_gemini(system: str, message: str) -> str:
    """Llama a Google Gemini API con API key."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.ai_model,
        contents=message,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=1024,
        ),
    )
    return response.text


# --- Streaming generators ---

async def _stream_api(system: str, messages: list[dict]):
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    with client.messages.stream(
        model=settings.ai_model,
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"


async def _stream_gemini(system: str, messages: list[dict]):
    from google import genai
    from google.genai import types

    contents = [
        types.Content(
            role="user" if m["role"] == "user" else "model",
            parts=[types.Part.from_text(text=m["content"])],
        )
        for m in messages
    ]
    client = genai.Client(api_key=settings.gemini_api_key)
    for chunk in client.models.generate_content_stream(
        model=settings.ai_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=1024,
        ),
    ):
        if chunk.text:
            yield f"data: {json.dumps({'text': chunk.text})}\n\n"
    yield "data: [DONE]\n\n"


async def _stream_cli(system: str, messages: list[dict]):
    last = messages[-1]["content"]
    history = "\n".join(
        f"{'Usuario' if m['role'] == 'user' else 'Asistente'}: {m['content']}"
        for m in messages[:-1]
    )
    prompt = f"{history}\n\nUsuario: {last}" if history else last
    result = await asyncio.to_thread(_call_cli, system, prompt)
    yield f"data: {json.dumps({'text': result})}\n\n"
    yield "data: [DONE]\n\n"


# --- Endpoints ---

@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatMessage, session: Session = Depends(get_session)):
    if settings.ai_backend == "api" and not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="API key de IA no configurada.")
    if settings.ai_backend == "gemini" and not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no configurada.")

    context = _build_context(body.garden_id, session) if body.garden_id else ""
    system = SYSTEM_PROMPT
    if context:
        system += f"\n\nContexto actual del usuario:\n{context}"

    try:
        if settings.ai_backend == "cli":
            reply = _call_cli(system, body.message)
        elif settings.ai_backend == "gemini":
            reply = _call_gemini(system, body.message)
        else:
            reply = _call_api(system, body.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(reply=reply)


@router.post("/chat/stream")
async def chat_stream(body: StreamChatRequest, session: Session = Depends(get_session)):
    if settings.ai_backend == "api" and not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="API key de IA no configurada.")
    if settings.ai_backend == "gemini" and not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no configurada.")

    context = _build_context(body.garden_id, session) if body.garden_id else ""
    system = SYSTEM_PROMPT + (f"\n\nContexto actual del usuario:\n{context}" if context else "")
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async def generate():
        try:
            if settings.ai_backend == "cli":
                async for chunk in _stream_cli(system, messages):
                    yield chunk
            elif settings.ai_backend == "gemini":
                async for chunk in _stream_gemini(system, messages):
                    yield chunk
            else:
                async for chunk in _stream_api(system, messages):
                    yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
