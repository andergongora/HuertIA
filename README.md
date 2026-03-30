# 🌱 HuertAI

Aplicación web para gestionar tu huerta doméstica. Registra qué plantas tienes, dónde están, qué les pasa y cuándo cosechar. Un asistente de IA contesta tus preguntas sobre cultivos y procesa tus notas para extraer resúmenes, etiquetas y consejos automáticamente.

---

## Características

### Parcela interactiva
- **Grid visual** de filas × huecos que representa tu huerta real
- Cada celda muestra el emoji de la planta, el nombre y la variedad
- Click en hueco vacío → asignar cultivo; click en planta → ver su detalle
- Añadir / eliminar filas y huecos con botones +/−
- Reordenar filas con flechas ↑/↓ (con confirmación)
- Eliminar plantas individuales desde su página de detalle
- Leyenda de colores automática al pie del grid

### Cultivos (Plantings)
- Registro de tipo de planta, variedad, origen (semilla / trasplante / esqueje) y fecha de plantación
- Estados: **activo**, **cosechado**, **perdido** — cambiables con un click
- Estimación de fecha de cosecha basada en `días_hasta_cosecha` del tipo de planta
- Cuenta regresiva visible en el sidebar ("3d", "¡Lista!")

### Eventos e historial
- Cuatro tipos de evento: **nota libre**, **cosecha**, **pérdida**, **foto**
- Cosechas y pérdidas admiten cantidad + unidad (kg / uds / g)
- Historial cronológico por cultivo con iconos y colores por tipo
- Procesado automático de notas con IA: resumen, etiquetas y consejo

### Gastos
- Registro por categoría: semillas, herramientas, abono, riego, pesticidas, estructura, alquiler, otros
- Filtros por huerta, categoría y rango de fechas
- Total acumulado visible en la pestaña de gastos

### Dashboard
- **8 KPIs**: total gastado, kg cosechados, tasa de éxito, coste/kg, cultivos activos, eventos totales, gastos registrados, tipos de planta
- Gráfico de pastel: estado de los cultivos (activos / cosechados / perdidos)
- Lista de últimas cosechas con cantidad y fecha
- Barras de actividad mensual (eventos registrados por mes)
- Barras de cosecha por tipo de cultivo
- Barras horizontales de gasto por categoría + línea de gasto acumulado
- Tabla resumen por cultivo: estado, eventos, kg, último evento

### Asistente de IA
- Chat en lenguaje natural con un agrónomo experto en horticultura mediterránea
- Contexto automático de tu huerta (cultivos activos y eventos recientes)
- Sugerencias de preguntas frecuentes en pantalla vacía
- Dos backends de IA configurables (ver sección de configuración)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.12) |
| Base de datos | PostgreSQL 16 |
| ORM | SQLModel + SQLAlchemy |
| Gráficos | Recharts |
| Enrutamiento | React Router v6 |
| IA (opción A) | `claude` CLI — suscripción Pro, sin coste de API |
| IA (opción B) | Anthropic API — pago por token |
| Notificaciones | Telegram Bot API |
| Deploy | Docker Compose |

---

## Estructura del proyecto

```
HuertAI/
├── backend/
│   ├── app/
│   │   ├── config.py          # Configuración via variables de entorno
│   │   ├── database.py        # Engine SQLAlchemy + sesiones
│   │   ├── models.py          # 5 modelos: Garden, Row, PlantType, Planting, PlantingEvent, Expense
│   │   ├── main.py            # FastAPI app, CORS, static files
│   │   ├── routes/
│   │   │   ├── gardens.py     # Gardens, Rows, PlantTypes
│   │   │   ├── crops.py       # Plantings CRUD
│   │   │   ├── events.py      # PlantingEvents + llamada IA
│   │   │   ├── expenses.py    # Expenses CRUD
│   │   │   └── chat.py        # Endpoint del asistente IA
│   │   └── services/
│   │       ├── ai_processor.py   # Procesado de notas (CLI o API)
│   │       └── notifications.py  # Telegram
│   ├── pyproject.toml
│   ├── .env                   # Variables de entorno (no commitear)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.ts      # Cliente fetch tipado para todos los endpoints
│   │   ├── types/index.ts     # Interfaces TypeScript
│   │   ├── components/
│   │   │   ├── GardenGrid.tsx
│   │   │   ├── RowEditor.tsx
│   │   │   ├── SlotCell.tsx
│   │   │   ├── CropModal.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventTimeline.tsx
│   │   │   ├── ExpenseForm.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── pages/
│   │   │   ├── GardenPage.tsx
│   │   │   ├── CropDetailPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
└── docker-compose.yml
```

---

## Modelo de datos

```
Garden          → tiene N Rows y N Plantings
Row             → pertenece a un Garden; tiene slot_count huecos
PlantType       → catálogo reutilizable (tomate cherry, lechuga hoja de roble…)
Planting        → cultivo concreto en un hueco (garden + row + slot_position)
PlantingEvent   → nota / cosecha / pérdida / foto sobre un Planting
Expense         → gasto asociado a un Garden
```

---

## Requisitos previos

- **Python 3.12+** con [uv](https://docs.astral.sh/uv/)
- **Node.js 18+** con npm
- **PostgreSQL 16** (local o via Docker)
- **claude CLI** instalado y con sesión activa si usas `AI_BACKEND=cli`

---

## Puesta en marcha en local

### 1. Base de datos

Con Docker (recomendado):

```bash
docker run -d --name huertai-db \
  -e POSTGRES_DB=huertai \
  -e POSTGRES_USER=huertai \
  -e POSTGRES_PASSWORD=huertai \
  -p 5432:5432 \
  postgres:16-alpine
```

O crea la base de datos manualmente en tu PostgreSQL local:

```sql
CREATE DATABASE huertai;
CREATE USER huertai WITH PASSWORD 'huertai';
GRANT ALL PRIVILEGES ON DATABASE huertai TO huertai;
```

### 2. Backend

```bash
cd backend

# Instalar dependencias
uv sync

# Configurar variables de entorno
cp .env.example .env   # o edita .env directamente

# Arrancar (crea las tablas automáticamente al iniciar)
uv run uvicorn app.main:app --reload --port 8000
```

El backend queda disponible en `http://localhost:8000`.
Documentación interactiva (Swagger): `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar servidor de desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3000`.

---

## Despliegue con Docker Compose

```bash
# En la raíz del proyecto
docker compose up -d
```

Servicios expuestos:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Configuración

Edita `backend/.env`:

```env
# ── Base de datos ──────────────────────────────────────────────
DATABASE_URL=postgresql://huertai:huertai@localhost:5432/huertai

# ── Almacenamiento de fotos ────────────────────────────────────
PHOTOS_DIRECTORY=photos

# ── Backend de IA ──────────────────────────────────────────────
# cli → usa el CLI de Claude con tu suscripción Pro (sin coste de API)
# api → usa la Anthropic API de pago
AI_BACKEND=cli

# Solo necesario si AI_BACKEND=api
ANTHROPIC_API_KEY=

# Modelo a usar (solo aplica en modo api)
AI_MODEL=claude-haiku-4-5-20251001
AI_MAX_TOKENS=512

# ── Notificaciones Telegram (opcional) ────────────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ── App ────────────────────────────────────────────────────────
DEBUG=false
APP_NAME=HuertAI
```

### Backend de IA: CLI vs API

| | `AI_BACKEND=cli` | `AI_BACKEND=api` |
|-|---|---|
| Coste | Gratis (incluido en suscripción Pro) | Pago por token |
| Requisito | `claude` CLI instalado + `claude login` | `ANTHROPIC_API_KEY` válida |
| Latencia | Un poco mayor (subprocess) | Baja |
| Recomendado | Uso personal / home server | Producción multi-usuario |

Para activar el modo CLI, asegúrate de tener Claude Code instalado y sesión iniciada:

```bash
# Instalar Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Autenticarse con tu cuenta Pro
claude login
```

---

## API REST — Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/gardens` | Crear huerta |
| `GET` | `/gardens` | Listar huertas |
| `GET` | `/gardens/{id}` | Detalle de huerta |
| `POST` | `/gardens/{id}/rows` | Añadir fila |
| `PATCH` | `/rows/{id}` | Actualizar fila (slot_count, position) |
| `DELETE` | `/rows/{id}` | Eliminar fila |
| `GET` | `/plant-types` | Catálogo de tipos de planta |
| `POST` | `/plant-types` | Crear tipo de planta |
| `POST` | `/plantings` | Plantar (asignar cultivo a hueco) |
| `GET` | `/plantings?garden_id=` | Listar cultivos de una huerta |
| `PATCH` | `/plantings/{id}` | Actualizar estado, posición, etc. |
| `DELETE` | `/plantings/{id}` | Eliminar cultivo |
| `POST` | `/plantings/{id}/events` | Registrar evento (nota/cosecha/foto) |
| `GET` | `/plantings/{id}/events` | Historial de eventos |
| `POST` | `/expenses` | Registrar gasto |
| `GET` | `/expenses?garden_id=` | Listar gastos |
| `DELETE` | `/expenses/{id}` | Eliminar gasto |
| `POST` | `/chat` | Asistente IA |
| `GET` | `/health` | Estado del servicio |

---

## Rutas del frontend

| Ruta | Página |
|------|--------|
| `/` | Redirige a `/gardens` |
| `/gardens` | Selector / creación de huerta |
| `/gardens/:id` | Vista principal: grid de la parcela y gastos |
| `/plantings/:id` | Detalle de cultivo: historial y formulario de eventos |
| `/dashboard` | Analítica: KPIs, gráficos y tabla resumen |
| `/chat` | Asistente de IA |

---

## Tipos de planta sugeridos

| Nombre | Variedad | Días hasta cosecha (trasplante) |
|--------|----------|--------------------------------|
| tomate | cherry | 70 |
| fresa | fresón | 55 |
| lechuga | hoja de roble | 40 |
| pimiento | padrón | 65 |
| pepino | — | 50 |
| berenjena | — | 70 |
| zanahoria | — | 75 |
| cebolla | — | 90 |

---

## Roadmap

- [x] Backend: modelos, CRUD completo, IA, Telegram
- [x] Frontend: grid interactivo, eventos, gastos, dashboard, chat IA
- [ ] Subida y visualización de fotos
- [ ] Recordatorios de cosecha vía Telegram (cron diario)
- [ ] Análisis de fotos con modelo de visión
- [ ] Histórico entre temporadas
- [ ] Rotación de cultivos
- [ ] PWA + modo offline
- [ ] Docker Compose completo para NAS

---

*HuertAI v0.1 · FastAPI + React + PostgreSQL · IA con suscripción Claude Pro*
