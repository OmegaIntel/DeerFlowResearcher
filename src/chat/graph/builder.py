from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

from src.llms.llm import basic_llm


def build_chat_graph_with_memory() -> ConversationChain:
    """Return a simple conversational chain with memory."""
    memory = ConversationBufferMemory(return_messages=True)
    chain = ConversationChain(llm=basic_llm, memory=memory)
    return chain
