from src.db.db_session import Base, engine
from src.db_models.report import Report # Import Report model to register it with Base.metadata


def init_db():
    # Only create tables if they don't exist
    Base.metadata.create_all(engine)
