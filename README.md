# 🌱 HuertAI

Aplicación web para gestionar tu huerta doméstica. Registra qué plantas tienes, dónde están, qué les pasa y cuándo cosechar. Un asistente de IA contesta tus preguntas sobre cultivos y procesa tus notas para extraer resúmenes, etiquetas y consejos automáticamente.

---

## Características

### Parcela interactiva
- **Grid visual** de filas × huecos que representa tu huerta real
- Cada celda muestra el emoji de la planta, el nombre, la variedad y la cuenta regresiva de cosecha
- Click en hueco vacío → asignar cultivo; click en planta → ver su detalle
- Añadir / eliminar filas y huecos con botones +/−
- Reordenar filas con flechas ↑/↓ (con confirmación)
- Eliminar plantas individuales desde su página de detalle
- Leyenda de colores automática al pie del grid

### Cultivos (Plantings)
- Registro de tipo de planta, variedad, origen (semilla / trasplante / esqueje) y fecha de plantación
- **Color personalizado por tipo de planta**: selector de colores con palabras en su propio color ("Rojo", "Azul"...) y paleta avanzada libre
- **Días hasta cosecha por planta individual**: se hereda del tipo pero se puede sobreescribir al plantar
- Estados: **activo**, **cosechado**, **perdido** — cambiables con un click
- Estimación de fecha de cosecha con cuenta regresiva visible en el grid y sidebar

### Eventos e historial
- Cuatro tipos de evento: **nota libre**, **cosecha**, **pérdida**, **foto**
- Cosechas y pérdidas admiten cantidad + unidad (kg / uds / g)
- Historial cronológico por cultivo con iconos y colores por tipo
- Procesado automático de notas con IA: resumen, etiquetas y consejo

### Gastos
- Registro por categoría: semillas, herramientas, abono, riego, pesticidas, estructura, alquiler, otros
- Total acumulado visible en la pestaña de gastos

### Dashboard
- **8 KPIs**: total gastado, kg cosechados, tasa de éxito, coste/kg, cultivos activos, eventos totales, gastos registrados, tipos de planta
- Gráfico de pastel: estado de los cultivos
- Últimas cosechas, actividad mensual, cosecha por cultivo, gasto por categoría

### Asistente de IA
- Chat en lenguaje natural con un agrónomo experto en horticultura mediterránea
- **Conversación multi-turno**: el asistente recuerda los mensajes anteriores
- **Streaming de respuestas**: el texto aparece palabra a palabra
- **Renderizado Markdown**: listas, negritas y formato en las respuestas
- Contexto automático de tu huerta (cultivos activos y eventos recientes)
- Tres backends de IA configurables: Claude CLI, Anthropic API y **Google Gemini**

### Autenticación
- Login y registro obligatorio con **Neon Auth** (Stack Auth)
- Todos los endpoints protegidos con JWT

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.12) |
| Base de datos | PostgreSQL (Neon) |
| ORM | SQLModel + SQLAlchemy |
| Autenticación | Neon Auth (Stack Auth) + PyJWT |
| Gráficos | Recharts |
| Enrutamiento | React Router v6 |
| IA (opción A) | `claude` CLI — suscripción Pro, sin coste de API |
| IA (opción B) | Anthropic API — pago por token |
| IA (opción C) | Google Gemini API |
| Notificaciones | Telegram Bot API (opcional) |
| Deploy | Render (backend) + Vercel (frontend) + Neon (BD) |

---

## Estructura del proyecto

```
HuertAI/
├── backend/
│   ├── app/
│   │   ├── config.py          # Configuración via variables de entorno
│   │   ├── database.py        # Engine SQLAlchemy + sesiones
│   │   ├── models.py          # Garden, Row, PlantType, Planting, PlantingEvent, Expense
│   │   ├── main.py            # FastAPI app, CORS, static files
│   │   ├── security.py        # Validación JWT con JWKS de Neon Auth
│   │   ├── routes/
│   │   │   ├── gardens.py     # Gardens, Rows, PlantTypes
│   │   │   ├── crops.py       # Plantings CRUD
│   │   │   ├── events.py      # PlantingEvents + llamada IA
│   │   │   ├── expenses.py    # Expenses CRUD
│   │   │   └── chat.py        # Asistente IA (single + streaming)
│   │   └── services/
│   │       ├── ai_processor.py   # Procesado de notas (CLI / Anthropic / Gemini)
│   │       └── notifications.py  # Telegram
│   ├── pyproject.toml
│   ├── requirements.txt       # Para despliegue en Render
│   ├── render.yaml            # Configuración de despliegue Render
│   └── .env                   # Variables de entorno (no commitear)
├── frontend/
│   ├── src/
│   │   ├── api/client.ts      # Cliente fetch tipado con JWT automático
│   │   ├── types/index.ts     # Interfaces TypeScript
│   │   ├── components/
│   │   │   ├── GardenGrid.tsx
│   │   │   ├── RowEditor.tsx
│   │   │   ├── SlotCell.tsx
│   │   │   ├── CropModal.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── EventTimeline.tsx
│   │   │   └── ExpenseForm.tsx
│   │   ├── pages/
│   │   │   ├── GardenPage.tsx
│   │   │   ├── CropDetailPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── App.tsx            # Rutas protegidas con ProtectedRoute
│   │   └── main.tsx           # StackProvider (Neon Auth)
│   ├── vercel.json            # Configuración de despliegue Vercel
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
```

---

## Modelo de datos

```
Garden          → tiene N Rows y N Plantings
Row             → pertenece a un Garden; tiene slot_count huecos
PlantType       → catálogo reutilizable (tomate cherry, lechuga…) con color y días_hasta_cosecha
Planting        → cultivo concreto en un hueco; puede sobreescribir días_hasta_cosecha
PlantingEvent   → nota / cosecha / pérdida / foto sobre un Planting
Expense         → gasto asociado a un Garden
```

---

## Puesta en marcha en local

### Requisitos previos
- **Python 3.12+** con [uv](https://docs.astral.sh/uv/)
- **Node.js 18+** con npm
- **PostgreSQL** local o conexión a Neon

### 1. Backend

```bash
cd backend

# Instalar dependencias
uv sync

# Configurar variables de entorno
cp .env.example .env   # editar con tus valores

# Arrancar (crea las tablas automáticamente al iniciar)
uv run uvicorn app.main:app --reload --port 8000
```

Documentación interactiva: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear frontend/.env con:
# VITE_API_URL=http://localhost:8000
# VITE_STACK_PROJECT_ID=xxx
# VITE_STACK_PUBLISHABLE_CLIENT_KEY=xxx

npm run dev
```

La app queda disponible en `http://localhost:3000`.

---

## Configuración (`backend/.env`)

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Backend de IA: cli | api | gemini
AI_BACKEND=gemini
GEMINI_API_KEY=            # si AI_BACKEND=gemini
ANTHROPIC_API_KEY=         # si AI_BACKEND=api
AI_MODEL=gemini-2.0-flash
AI_MAX_TOKENS=512

# Autenticación (Neon Auth)
STACK_JWKS_URL=https://api.stack-auth.com/api/v1/projects/xxx/.well-known/jwks.json

# CORS (separados por comas)
CORS_ORIGINS=https://tu-app.vercel.app,http://localhost:3000,http://localhost:5173

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# App
DEBUG=false
APP_NAME=HuertAI
```

### Backends de IA

| | `cli` | `api` | `gemini` |
|-|---|---|---|
| Coste | Gratis (Pro) | Pago por token | Pago por token (muy bajo) |
| Requisito | Claude CLI instalado | `ANTHROPIC_API_KEY` | `GEMINI_API_KEY` |
| Recomendado | Desarrollo local | Producción | Producción |

---

## Despliegue (Neon + Render + Vercel)

### Base de datos — Neon
Crea un proyecto en [neon.tech](https://neon.tech). Copia la connection string con `?sslmode=require`.

### Backend — Render
1. Conecta el repo, Root Directory: `backend`
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Variables de entorno: `DATABASE_URL`, `GEMINI_API_KEY`, `AI_BACKEND`, `AI_MODEL`, `CORS_ORIGINS`, `STACK_JWKS_URL`

### Frontend — Vercel
1. Conecta el repo, Root Directory: `frontend`, Framework: Vite
2. Variables de entorno: `VITE_API_URL`, `VITE_STACK_PROJECT_ID`, `VITE_STACK_PUBLISHABLE_CLIENT_KEY`

---

## API REST — Endpoints principales

Todos los endpoints (excepto `/health`) requieren header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio |
| `POST` | `/gardens` | Crear huerta |
| `GET` | `/gardens` | Listar huertas |
| `POST` | `/gardens/{id}/rows` | Añadir fila |
| `PATCH` | `/rows/{id}` | Actualizar fila |
| `GET` | `/plant-types` | Catálogo de tipos de planta |
| `POST` | `/plant-types` | Crear tipo de planta |
| `PATCH` | `/plant-types/{id}` | Actualizar tipo (color, días…) |
| `POST` | `/plantings` | Plantar |
| `GET` | `/plantings?garden_id=` | Listar cultivos |
| `PATCH` | `/plantings/{id}` | Actualizar estado, días, etc. |
| `DELETE` | `/plantings/{id}` | Eliminar cultivo |
| `POST` | `/plantings/{id}/events` | Registrar evento |
| `GET` | `/plantings/{id}/events` | Historial de eventos |
| `POST` | `/expenses` | Registrar gasto |
| `GET` | `/expenses?garden_id=` | Listar gastos |
| `POST` | `/chat` | Asistente IA (respuesta completa) |
| `POST` | `/chat/stream` | Asistente IA (streaming SSE) |

---

## Roadmap

- [x] Backend: modelos, CRUD completo, IA, Telegram
- [x] Frontend: grid interactivo, eventos, gastos, dashboard, chat IA
- [x] Color personalizado por tipo de planta
- [x] Días hasta cosecha por planta individual
- [x] Chat multi-turno con streaming y Markdown
- [x] Soporte Google Gemini
- [x] Autenticación con Neon Auth
- [x] Despliegue en Render + Vercel + Neon
- [ ] Subida y visualización de fotos
- [ ] Recordatorios de cosecha vía Telegram (cron diario)
- [ ] Análisis de fotos con modelo de visión
- [ ] Histórico entre temporadas
- [ ] Rotación de cultivos
- [ ] PWA + modo offline

---

*HuertAI · FastAPI + React + PostgreSQL · Neon Auth · IA con Gemini / Claude*
