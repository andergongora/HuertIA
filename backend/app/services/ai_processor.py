"""
AI processor: procesa notas de cultivos y devuelve resumen, tags y consejo.

Backends configurables via AI_BACKEND en .env:
  cli    → claude CLI con suscripción Pro (sin coste de API)
  api    → Anthropic API con ANTHROPIC_API_KEY
  gemini → Google Gemini API con GEMINI_API_KEY
"""
import asyncio
import json
from app.config import settings

SYSTEM_PROMPT = (
    "Eres un asistente experto en horticultura. "
    "El usuario te manda notas en texto libre sobre sus cultivos en el huerto. "
    "Analiza la nota y devuelve la información estructurada solicitada."
)

# Esquema para output_config (backend api)
OUTPUT_SCHEMA_API = {
    "format": {
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "resumen": {
                    "type": "string",
                    "description": "Resumen de la nota en máximo 100 palabras.",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Categorías relevantes (riego, plaga, cosecha, abono, poda, siembra...).",
                },
                "consejo": {
                    "type": ["string", "null"],
                    "description": "Sugerencia accionable si procede, o null.",
                },
            },
            "required": ["resumen", "tags", "consejo"],
            "additionalProperties": False,
        },
    }
}

# Esquema para --json-schema (backend cli)
OUTPUT_SCHEMA_CLI = json.dumps({
    "type": "object",
    "properties": {
        "resumen": {"type": "string", "description": "Resumen en máximo 100 palabras."},
        "tags": {"type": "array", "items": {"type": "string"}, "description": "Categorías relevantes."},
        "consejo": {"type": ["string", "null"], "description": "Sugerencia accionable o null."},
    },
    "required": ["resumen", "tags", "consejo"],
    "additionalProperties": False,
})


async def _process_via_cli(raw_note: str) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "claude", "-p", raw_note,
        "--system-prompt", SYSTEM_PROMPT,
        "--output-format", "json",
        "--json-schema", OUTPUT_SCHEMA_CLI,
        "--bare",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI error: {stderr.decode().strip()}")

    data = json.loads(stdout.decode())
    # Con --json-schema el resultado va en 'structured_output'
    structured = data.get("structured_output")
    if structured:
        return structured
    # Fallback: el modelo devolvió JSON como texto
    return json.loads(data["result"])


async def _process_via_api(raw_note: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": raw_note}],
        output_config=OUTPUT_SCHEMA_API,
    )
    return json.loads(message.content[0].text)


async def _process_via_gemini(raw_note: str) -> dict:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    schema = {
        "type": "OBJECT",
        "properties": {
            "resumen": {"type": "STRING", "description": "Resumen en máximo 100 palabras."},
            "tags": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Categorías relevantes."},
            "consejo": {"type": "STRING", "nullable": True, "description": "Sugerencia accionable o null."},
        },
        "required": ["resumen", "tags", "consejo"],
    }
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=settings.ai_model,
        contents=raw_note,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=schema,
            max_output_tokens=settings.ai_max_tokens,
        ),
    )
    return json.loads(response.text)


async def process_note(raw_note: str, planting, session) -> dict:
    """
    Procesa una nota libre y devuelve:
    { "resumen": str, "tags": list[str], "consejo": str | None }
    """
    if settings.ai_backend == "cli":
        return await _process_via_cli(raw_note)

    if settings.ai_backend == "gemini":
        if not settings.gemini_api_key:
            return {"resumen": raw_note[:200], "tags": [], "consejo": None}
        return await _process_via_gemini(raw_note)

    if not settings.anthropic_api_key:
        return {"resumen": raw_note[:200], "tags": [], "consejo": None}

    return await _process_via_api(raw_note)
