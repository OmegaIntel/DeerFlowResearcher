import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Load DB connection settings from environment variables
DATABASE_USER_NAME = os.getenv("DATABASE_USER_NAME")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = int(os.getenv("DATABASE_PORT"))
DATABASE_NAME = os.getenv("DATABASE_NAME")

# Compose full database URL
DATABASE_URL = f"mysql+mysqlconnector://{DATABASE_USER_NAME}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a base class for models
Base = declarative_base()

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get a new DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Export all essentials from this module
__all__ = ["engine", "SessionLocal", "Base", "get_db"]
