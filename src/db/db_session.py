import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from src.db_models import Base, ChatSession, ChatMessage

load_dotenv()

DATABASE_USER_NAME = os.getenv("DATABASE_USER_NAME", "root")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "password")
DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = int(os.getenv("DATABASE_PORT", "3306"))
DATABASE_NAME = os.getenv("DATABASE_NAME", "deer_flow")

DATABASE_URL = (
    f"mysql+mysqlconnector://{DATABASE_USER_NAME}:{DATABASE_PASSWORD}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_db_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_chat_session(db: Session, thread_id: str, user_id: str = None) -> ChatSession:
    session_obj = (
        db.query(ChatSession).filter(ChatSession.thread_id == thread_id).first()
    )
    if not session_obj:
        session_obj = ChatSession(thread_id=thread_id, user_id=user_id, mode='chat')
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
    return session_obj


def add_chat_message(
    db: Session, session_obj: ChatSession, role: str, content: str, attachments=None
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session_obj.id, 
        role=role, 
        content=content,
        attachments=attachments  # Store attachments metadata
    )
    db.add(msg)
    
    # If this is the first user message and session has no title, set it
    if role == "user" and (not session_obj.title or session_obj.title == ""):
        # Check if this is the first user message
        existing_user_messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_obj.id,
            ChatMessage.role == "user"
        ).count()
        
        if existing_user_messages == 0:  # This is the first user message
            session_obj.title = content[:100]  # Limit to 100 chars
            db.add(session_obj)
    
    db.commit()
    db.refresh(msg)
    return msg
