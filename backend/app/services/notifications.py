"""
Notificaciones vía Telegram.
Funciona en modo stub si no hay token configurado.
"""
import httpx
from app.config import settings


async def send_telegram(message: str) -> bool:
    """Envía un mensaje al chat de Telegram configurado. Devuelve True si tiene éxito."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {"chat_id": settings.telegram_chat_id, "text": message, "parse_mode": "Markdown"}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=10)
        return response.is_success


async def notify_harvest(planting_id: str, plant_name: str, quantity: float, unit: str) -> None:
    """Notifica una cosecha registrada."""
    await send_telegram(
        f"🌿 *Cosecha registrada*\n"
        f"Cultivo: {plant_name}\n"
        f"Cantidad: {quantity} {unit}"
    )


async def notify_event_advice(plant_name: str, advice: str) -> None:
    """Notifica un consejo de la IA tras registrar un evento."""
    await send_telegram(
        f"💡 *Consejo para {plant_name}*\n{advice}"
    )
