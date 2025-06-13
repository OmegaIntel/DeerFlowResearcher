"""Database-backed chat history for message persistence"""

from typing import List
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from sqlalchemy.orm import Session
from src.db.db_session import SessionLocal
from src.db_models.chat_session import ChatSession
from src.db_models.chat_message import ChatMessage


class DatabaseChatMessageHistory(BaseChatMessageHistory):
    """Chat message history that persists to database"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self._messages: List[BaseMessage] = []
        self._loaded = False
    
    @property
    def messages(self) -> List[BaseMessage]:
        """Lazy load messages from database"""
        if not self._loaded:
            self._load_messages()
        return self._messages
    
    def _load_messages(self):
        """Load messages from database"""
        db = SessionLocal()
        try:
            # Find session by thread_id
            session = db.query(ChatSession).filter(
                ChatSession.thread_id == self.session_id
            ).first()
            
            if session:
                # Load all messages for this session
                db_messages = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session.id
                ).order_by(ChatMessage.created_at).all()
                
                # Convert to LangChain messages
                self._messages = []
                for msg in db_messages:
                    if msg.role == "user":
                        self._messages.append(HumanMessage(content=msg.content))
                    elif msg.role == "assistant":
                        self._messages.append(AIMessage(content=msg.content))
            
            self._loaded = True
        finally:
            db.close()
    
    def add_message(self, message: BaseMessage) -> None:
        """Add message to memory (database saving handled separately)"""
        if not self._loaded:
            self._load_messages()
        self._messages.append(message)
    
    def clear(self) -> None:
        """Clear messages from memory"""
        self._messages = []
        self._loaded = True