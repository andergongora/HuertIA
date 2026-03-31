from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from uuid import UUID, uuid4
from datetime import datetime
from datetime import date as date_type
from enum import Enum


class PlantOrigin(str, Enum):
    SEED = "seed"
    SEEDLING = "seedling"
    CUTTING = "cutting"


class PlantingStatus(str, Enum):
    ACTIVE = "active"
    HARVESTED = "harvested"
    LOST = "lost"


class EventType(str, Enum):
    NOTE = "note"
    PHOTO = "photo"
    HARVEST = "harvest"
    LOSS = "loss"


class Garden(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.now)


class Row(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    garden_id: UUID = Field(foreign_key="garden.id")
    position: int
    slot_count: int = 3


class PlantType(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    variety: str | None = None
    days_to_harvest: int | None = None
    color: str | None = None  # hex, e.g. "#ff5733"
    created_at: datetime = Field(default_factory=datetime.now)


class Planting(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    garden_id: UUID = Field(foreign_key="garden.id")
    row_id: UUID | None = Field(default=None, foreign_key="row.id")
    slot_position: int | None = None
    plant_type_id: UUID = Field(foreign_key="planttype.id")
    origin: PlantOrigin
    planted_at: date_type = Field(default_factory=date_type.today)
    status: PlantingStatus = PlantingStatus.ACTIVE
    days_to_harvest: int | None = None  # sobreescribe PlantType.days_to_harvest
    created_at: datetime = Field(default_factory=datetime.now)


class PlantingEvent(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    planting_id: UUID = Field(foreign_key="planting.id")
    event_type: EventType
    raw_note: str | None = None
    ai_summary: str | None = None
    ai_tags: list[str] = Field(default_factory=list, sa_column=Column(JSONB, nullable=True))
    ai_advice: str | None = None
    photo_path: str | None = None
    quantity: float | None = None
    unit: str | None = None
    created_at: datetime = Field(default_factory=datetime.now)


class Expense(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    garden_id: UUID = Field(foreign_key="garden.id")
    category: str
    amount: float
    description: str
    date: date_type = Field(default_factory=date_type.today)


class User(SQLModel, table=True):
    __tablename__ = "app_user"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.now)
