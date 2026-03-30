from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.config import settings
from app.database import create_db_and_tables
from app.routes import gardens, crops, events, expenses, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir fotos estáticas si el directorio existe
if os.path.isdir(settings.photos_directory):
    app.mount("/photos", StaticFiles(directory=settings.photos_directory), name="photos")

app.include_router(gardens.router, tags=["gardens"])
app.include_router(crops.router, tags=["plantings"])
app.include_router(events.router, tags=["events"])
app.include_router(expenses.router, tags=["expenses"])
app.include_router(chat.router, tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
