from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"sslmode": "require"} if "neon" in settings.database_url else {},
    pool_pre_ping=True,
    pool_recycle=300,
)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
