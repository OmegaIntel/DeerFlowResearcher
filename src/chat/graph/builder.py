from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import Dict

from src.llms.llm import basic_llm
from .db_history import DatabaseChatMessageHistory

# Store for chat histories (mix of in-memory and DB-backed)
store: Dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        # Use database-backed history for persistence
        store[session_id] = DatabaseChatMessageHistory(session_id)
    return store[session_id]

def build_chat_graph_with_memory() -> RunnableWithMessageHistory:
    """Return a simple conversational chain with memory using the new API."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful AI assistant. When citations are provided in the context, use them inline in your response but NEVER add a References or Bibliography section at the end."),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])
    
    chain = prompt | basic_llm
    
    return RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )
