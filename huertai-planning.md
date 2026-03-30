# 🌱 HuertAI —

## Visión

App sencilla para gestionar tu huerta: registrar qué has plantado, dónde, qué le pasa y cuándo recogerlo. La IA procesa tus notas y te da consejos.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Tailwind |
| Backend | FastAPI (Python) |
| BD | PostgreSQL |
| ORM | SQLModel |
| IA | Gemini Flash / Claude API |
| Fotos | Filesystem local (NAS) |
| Notificaciones | Telegram Bot API |
| Deploy | Docker Compose en NAS |

**Coste: 0€**

---

## Modelo de datos

```
Garden
├── id: UUID (PK)
├── name: str
└── created_at: datetime

Row
├── id: UUID (PK)
├── garden_id: UUID (FK → Garden)
├── position: int          # orden: 1, 2, 3...
└── slot_count: int        # huecos en la fila, editable con +/-

PlantType
├── id: UUID (PK)
├── name: str                   # "tomate", "lechuga", "pimiento"
├── variety: str (nullable)     # "cherry", "hoja de roble", "padrón"
├── days_to_harvest: int (nullable)  # referencia estática por tipo
└── created_at: datetime

Planting                        (antes Crop — el "dónde y cuándo")
├── id: UUID (PK)
├── garden_id: UUID (FK → Garden)
├── row_id: UUID (FK → Row, nullable)
├── slot_position: int (nullable)
├── plant_type_id: UUID (FK → PlantType)
├── origin: str                 # "seed" | "seedling" | "cutting"
├── planted_at: date
├── status: str                 # "active" | "harvested" | "lost"
└── created_at: datetime

PlantingEvent
├── id: UUID (PK)
├── planting_id: UUID (FK → Planting)
├── event_type: str             # "note" | "photo" | "harvest" | "loss"
├── raw_note: str (nullable)
├── ai_summary: str (nullable)
├── ai_tags: list[str]          # JSONB
├── ai_advice: str (nullable)
├── photo_path: str (nullable)
├── quantity: float (nullable)
├── unit: str (nullable)        # "kg" | "uds"
└── created_at: datetime

Expense
├── id: UUID (PK)
├── garden_id: UUID (FK → Garden)
├── category: str
├── amount: float
├── description: str
└── date: date
```

**5 tablas, sin tabla Slot ni Harvest separada.** Un Crop sabe en qué fila y posición está. Las cosechas y pérdidas son CropEvents con quantity.

---

## Cómo funciona el grid

- Una Garden tiene N Rows ordenadas por `position`
- Cada Row tiene `slot_count` → el usuario lo cambia con +/-
- Cada slot es una posición (1..slot_count). Si hay un Crop con ese `row_id` + `slot_position`, está ocupado; si no, está vacío
- Click en slot vacío → crear/asignar Crop
- Click en slot ocupado → ver cultivo / añadir evento
- Añadir hueco → incrementar `slot_count`
- Quitar hueco → decrementar (confirmar si el último tiene cultivo)

---

## Fases

### FASE 1 — MVP funcional (3-4 semanas)

**Semana 1: Backend + modelos**
- [ ] Inicializar proyecto con uv
- [ ] Modelos SQLModel (5 tablas)
- [ ] PostgreSQL en Docker
- [ ] Endpoints CRUD: gardens, rows, crops, events, expenses
- [ ] Seed de datos de prueba

**Semana 2: Grid interactivo**
- [ ] Grid de la parcela: filas × slots como celdas
- [ ] Colores por tipo de cultivo + leyenda
- [ ] +/- para slot_count de cada fila
- [ ] Añadir/eliminar filas
- [ ] Click en slot → modal para asignar cultivo

**Semana 3: Eventos y registro**
- [ ] Seleccionar cultivo → añadir evento (nota, cosecha, pérdida, foto)
- [ ] Subida de fotos
- [ ] Lista de eventos por cultivo
- [ ] Registro de gastos
- [ ] Vista resumen: cultivos activos, próximas cosechas (planted_at + days_to_harvest)

**Semana 4: Docker + deploy**
- [ ] Docker Compose: frontend + backend + postgres + volumen fotos
- [ ] Desplegar en NAS
- [ ] Pulido y bugs

---

### FASE 2 — IA asistente (2-3 semanas)

- [ ] Procesar notas con IA → extraer resumen, tags, consejo
- [ ] Análisis de fotos con modelo de visión
- [ ] Cron: recordatorios de cosecha → Telegram

**Prompt de notas:**
```
Eres un agrónomo en Valencia, España.

Cultivo: {plant_type} ({variety})
Plantado como: {origin} el {planted_at}
Eventos recientes: {últimos 5}

Nota del usuario: "{raw_note}"

Responde SOLO en JSON:
{
  "resumen": "frase corta",
  "tags": ["tag1", "tag2"],
  "severidad": "baja|media|alta|null",
  "consejo": "2-3 frases máximo"
}
```

---

### FASE 3 — Dashboards (2 semanas)

- [ ] Producción: cosechas por cultivo, tasa éxito, kg totales
- [ ] Gastos: por categoría, acumulado, coste por kg
- [ ] Gráficos con Recharts

---

### FASE 4 — Futuro

- Chat con RAG sobre docs agrícolas
- Histórico entre temporadas
- Rotación de cultivos
- IoT (ESP32)
- PWA + offline

---

## Estructura del proyecto

```
huertai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── routes/
│   │   │   ├── gardens.py
│   │   │   ├── crops.py
│   │   │   ├── events.py
│   │   │   └── expenses.py
│   │   └── services/
│   │       ├── ai_processor.py
│   │       └── notifications.py
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GardenGrid.tsx
│   │   │   ├── RowEditor.tsx
│   │   │   ├── SlotCell.tsx
│   │   │   ├── CropModal.tsx
│   │   │   ├── EventForm.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Docker Compose base

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: huertai
      POSTGRES_USER: huertai
      POSTGRES_PASSWORD: huertai
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://huertai:huertai@db:5432/huertai
    volumes:
      - photos:/app/photos
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  pgdata:
  photos:
```

---

## Para empezar

```bash
mkdir huertai && cd huertai
mkdir backend frontend

# Backend
cd backend && uv init
uv add fastapi uvicorn sqlmodel psycopg2-binary python-multipart aiofiles

# Postgres local para desarrollo
docker run -d --name huertai-db \
  -e POSTGRES_DB=huertai \
  -e POSTGRES_USER=huertai \
  -e POSTGRES_PASSWORD=huertai \
  -p 5432:5432 \
  postgres:16-alpine
```

---

*HuertAI v3 · 5 tablas · PostgreSQL · MVP-first · Abril 2026*