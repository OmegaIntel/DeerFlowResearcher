from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_USER_NAME = os.getenv("DATABASE_USER_NAME")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = int(os.getenv("DATABASE_PORT"))
DATABASE_NAME = os.getenv("DATABASE_NAME")

DATABASE_URL = f"mysql+mysqlconnector://{DATABASE_USER_NAME}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"


# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a base class for our models
Base = declarative_base()

# Create a session factory bound to our engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency function to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from sqlalchemy.orm import Session
from src.db_models import ChatSession, ChatMessage


def get_or_create_chat_session(db: Session, thread_id: str) -> ChatSession:
    session_obj = (
        db.query(ChatSession).filter(ChatSession.thread_id == thread_id).first()
    )
    if session_obj is None:
        session_obj = ChatSession(thread_id=thread_id)
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
    return session_obj


def add_chat_message(
    db: Session, session_id: str, role: str, content: str
) -> ChatMessage:
    message = ChatMessage(session_id=session_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
