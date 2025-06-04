from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

from src.llms.llm import get_llm_by_type


def build_chat_graph_with_memory() -> ConversationChain:
    """Return a simple conversation chain with memory."""
    llm = get_llm_by_type("basic")
    memory = ConversationBufferMemory(return_messages=True)
    return ConversationChain(llm=llm, memory=memory)
