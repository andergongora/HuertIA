# 🌱 HuertAI — Roadmap detallado

## Estructura del proyecto

```
huertai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── gardens.py
│   │   │   ├── crops.py
│   │   │   ├── events.py
│   │   │   └── expenses.py
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── ai_processor.py
│   │       └── notifications.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
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
│   │   │   └── DashboardPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Backend: archivo por archivo

### `app/config.py`
Configuración con Pydantic Settings. Lee variables de entorno (DATABASE_URL, directorio de fotos, API keys de IA, token del bot de Telegram). Un solo sitio para toda la config, sin hardcodear nada.

### `app/database.py`
Crea el engine de SQLAlchemy apuntando a Postgres, define la función `get_session` como dependency de FastAPI (yield de una Session que se cierra sola), y una función `create_db_and_tables` que llama a `SQLModel.metadata.create_all()` para crear las tablas al arrancar.

### `app/models.py`
Los 5 modelos SQLModel: Garden, Row, Crop, CropEvent, Expense. Cada uno es a la vez tabla de BD y schema Pydantic. Aquí también irían los schemas de request/response si necesitas que difieran del modelo (por ejemplo, un `CropCreate` sin id ni created_at). Para el MVP puedes empezar con los modelos directamente y separar schemas solo cuando haga falta.

### `app/main.py`
El punto de entrada de FastAPI. Crea la app, registra los routers de cada módulo de rutas, configura CORS para que el frontend pueda llamar a la API, y en el evento `on_startup` llama a `create_db_and_tables()`. También monta la carpeta de fotos como archivos estáticos para servirlas por HTTP.

### `app/routes/gardens.py`
CRUD de gardens y rows:
- `POST /gardens` → crear huerta
- `GET /gardens` → listar huertas
- `GET /gardens/{id}` → detalle con sus rows y crops
- `POST /gardens/{id}/rows` → añadir fila
- `PATCH /rows/{id}` → cambiar slot_count, position
- `DELETE /rows/{id}` → eliminar fila

### `app/routes/crops.py`
CRUD de cultivos:
- `POST /crops` → crear cultivo (asignado a garden + row + slot_position)
- `GET /crops?garden_id=...` → listar cultivos de una huerta
- `GET /crops/{id}` → detalle del cultivo con sus eventos
- `PATCH /crops/{id}` → editar (cambiar status, mover de slot, etc.)
- `DELETE /crops/{id}` → eliminar

### `app/routes/events.py`
Gestión de eventos de cultivos:
- `POST /crops/{id}/events` → crear evento (nota, foto, cosecha, pérdida). Si viene raw_note, llama al servicio de IA para procesarla. Si viene foto, la guarda en disco.
- `GET /crops/{id}/events` → listar eventos de un cultivo, ordenados por fecha

### `app/routes/expenses.py`
CRUD de gastos:
- `POST /expenses` → registrar gasto
- `GET /expenses?garden_id=...` → listar gastos, con filtros opcionales por categoría o rango de fechas
- `DELETE /expenses/{id}` → eliminar gasto

### `app/services/ai_processor.py`
Función que recibe la nota del usuario + contexto del cultivo, llama a la API de Gemini/Claude con el prompt de agrónomo, parsea el JSON de respuesta y devuelve resumen, tags y consejo. Encapsulado en una función async para no bloquear el endpoint. Si la API falla, el evento se guarda igual pero sin campos de IA (graceful degradation).

### `app/services/notifications.py`
Función que envía mensajes por Telegram. Un cron (puedes usar APScheduler o un script aparte) recorre los cultivos activos cada día, calcula si `planted_at + days_to_harvest` está a menos de X días, y envía recordatorio. Empezar con un script que ejecutas con cron del sistema o un endpoint manual `/notify/check-harvests`.

---

## Frontend: archivo por archivo

### `src/api/client.ts`
Cliente HTTP centralizado (fetch o axios). Define la base URL del backend y funciones tipadas para cada endpoint: `getGarden()`, `createCrop()`, `addEvent()`, etc. Un solo sitio para toda la comunicación con la API, así si cambias algo en el backend solo tocas aquí.

### `src/types/index.ts`
Interfaces TypeScript que reflejan los modelos del backend: Garden, Row, Crop, CropEvent, Expense. Mantenerlas alineadas con los modelos de SQLModel. No hace falta que sean idénticas, solo lo que el frontend necesita.

### `src/components/GardenGrid.tsx`
El componente principal. Recibe un Garden con sus Rows y Crops. Renderiza una lista vertical de `RowEditor`, cada uno representando una fila de la huerta. Incluye un botón "Añadir fila" al final.

### `src/components/RowEditor.tsx`
Una fila de la huerta. Muestra el número de fila, los slots como una fila horizontal de `SlotCell`, y los botones +/- para cambiar slot_count. Llama a la API para actualizar el slot_count cuando se pulsa +/-.

### `src/components/SlotCell.tsx`
Una celda individual. Si está vacía: cuadrado gris con borde, clickable → abre CropModal para asignar cultivo. Si tiene cultivo: cuadrado coloreado según plant_type, muestra nombre corto, clickable → navega al detalle del cultivo.

### `src/components/CropModal.tsx`
Modal que aparece al clickar un slot vacío. Formulario simple: tipo de planta (select o input), variedad (opcional), origen (seed/seedling/cutting), fecha de siembra (datepicker, default hoy), days_to_harvest (input numérico, con valor sugerido según tipo). Al guardar → POST /crops.

### `src/components/EventForm.tsx`
Formulario para añadir un evento a un cultivo. Select de tipo (nota, cosecha, pérdida, foto), textarea para la nota, input de foto, y si es cosecha/pérdida: cantidad + unidad. Al guardar → POST /crops/{id}/events. Muestra el consejo de la IA debajo si viene en la respuesta.

### `src/components/EventTimeline.tsx`
Lista cronológica de eventos de un cultivo. Cada evento muestra: fecha, tipo (con icono/color), nota del usuario, y si tiene ai_summary/ai_advice lo muestra debajo en un bloque diferenciado. Las fotos se muestran como thumbnail clickable.

### `src/components/ExpenseForm.tsx`
Formulario de gastos: categoría (select), cantidad (€), descripción, fecha. Reutilizable como modal o como sección en una página.

### `src/components/Dashboard.tsx`
Vista con gráficos Recharts: barras de cosechas por cultivo, línea de gastos acumulados, tarjetas resumen (total gastado, kg cosechados, cultivos activos). Se alimenta de endpoints tipo `GET /expenses?garden_id=...` y agregaciones que haga el frontend o el backend.

### `src/pages/GardenPage.tsx`
Página principal. Carga el garden con sus rows y crops, renderiza GardenGrid. Incluye un sidebar o panel inferior con resumen rápido: cultivos activos, próximas cosechas, últimos eventos.

### `src/pages/CropDetailPage.tsx`
Página de detalle de un cultivo. Muestra la info del cultivo (tipo, variedad, fecha, status), el EventTimeline, y el EventForm para añadir eventos. Ruta: `/crops/:id`.

### `src/pages/DashboardPage.tsx`
Página con el Dashboard de producción y gastos. Ruta: `/dashboard`.

---

## Roadmap semana a semana

### Semana 1 — Backend base

**Objetivo**: API funcionando con Postgres, probada con curl/httpie.

| Día | Tarea |
|-----|-------|
| L | Setup: repo, uv init, docker-compose con Postgres, config.py, database.py |
| M | models.py: los 5 modelos SQLModel + create_all |
| X | routes/gardens.py + routes/crops.py con CRUD completo |
| J | routes/events.py + routes/expenses.py |
| V | main.py: montar routers, CORS, static files. Probar todos los endpoints |

### Semana 2 — Frontend: grid interactivo

**Objetivo**: Ver la parcela, crear filas, añadir/quitar huecos, asignar cultivos.

| Día | Tarea |
|-----|-------|
| L | Setup: Vite + React + TS + Tailwind. client.ts con las llamadas a la API |
| M | types/index.ts + GardenGrid + RowEditor (renderizar filas y slots) |
| X | SlotCell con colores + CropModal para asignar cultivo |
| J | Botones +/- en RowEditor, añadir/eliminar filas |
| V | Leyenda de colores, pulido visual, probar flujo completo |

### Semana 3 — Eventos, fotos y gastos

**Objetivo**: Registrar todo lo que pasa en la huerta.

| Día | Tarea |
|-----|-------|
| L | CropDetailPage + EventForm (notas y fotos) |
| M | EventTimeline: lista de eventos con iconos y fotos |
| X | Cosechas y pérdidas en EventForm (quantity + unit) |
| J | ExpenseForm + listado de gastos |
| V | Vista resumen en GardenPage: cultivos activos, próximas cosechas |

### Semana 4 — IA + deploy

**Objetivo**: Las notas se procesan con IA, la app corre en la NAS.

| Día | Tarea |
|-----|-------|
| L | ai_processor.py: función de procesamiento de notas + integrar en POST /events |
| M | Mostrar ai_summary y ai_advice en EventTimeline |
| X | Dockerfiles (backend + frontend) + docker-compose completo |
| J | Deploy en NAS, probar en red local |
| V | Bugs, ajustes, README |

### Semana 5-6 — Recordatorios + dashboard (si hay ganas)

| Tarea |
|-------|
| Script de recordatorios → Telegram |
| Dashboard con Recharts: producción + gastos |
| Análisis de fotos con modelo de visión |

---

## Orden de dependencias

```
config.py → database.py → models.py → routes/* → main.py
                                         ↓
                                    services/*
```

Empieza por config y database, luego modelos, luego rutas. Los services (IA, notificaciones) se enchufan después sin tocar lo anterior.

---

*HuertAI · Roadmap v1 · Abril 2026*
