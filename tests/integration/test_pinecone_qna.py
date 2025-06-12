"""
Integration tests for Pinecone QnA functionality
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
import sys
sys.path.append('/root/deer-flow/src')

from src.tools.pinecone_search import PineconeSearchTool, SearchResult


@pytest.fixture
def mock_pinecone_client():
    """Mock Pinecone client for testing"""
    with patch('src.tools.pinecone_search.Pinecone') as mock_pc:
        mock_client = Mock()
        mock_pc.return_value = mock_client
        
        # Mock index listing
        mock_index_info = Mock()
        mock_index_info.name = "test-index"
        mock_index_info.dimension = 1536
        mock_index_info.metric = "cosine"
        mock_index_info.host = "test-host"
        mock_client.list_indexes.return_value = [mock_index_info]
        
        # Mock index stats
        mock_index = Mock()
        mock_stats = Mock()
        mock_stats.total_vector_count = 100
        mock_stats.namespaces = {}
        mock_index.describe_index_stats.return_value = mock_stats
        mock_client.Index.return_value = mock_index
        
        # Mock search results
        mock_match = Mock()
        mock_match.id = "test-id-1"
        mock_match.score = 0.95
        mock_match.metadata = {
            "text": "This is a test document about artificial intelligence and machine learning.",
            "filename": "test.pdf",
            "chunk_index": 0
        }
        
        mock_results = Mock()
        mock_results.matches = [mock_match]
        mock_index.query.return_value = mock_results
        
        yield mock_client


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing"""
    with patch('src.tools.pinecone_search.OpenAI') as mock_openai:
        mock_client = Mock()
        mock_openai.return_value = mock_client
        
        # Mock embedding response
        mock_embedding_data = Mock()
        mock_embedding_data.embedding = [0.1] * 1536
        mock_embedding_response = Mock()
        mock_embedding_response.data = [mock_embedding_data]
        mock_client.embeddings.create.return_value = mock_embedding_response
        
        # Mock chat completion response
        mock_choice = Mock()
        mock_choice.message.content = "Based on the provided context, artificial intelligence is a field that focuses on creating intelligent machines."
        mock_completion_response = Mock()
        mock_completion_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion_response
        
        yield mock_client


@pytest.fixture
def pinecone_tool(mock_pinecone_client, mock_openai_client):
    """Create PineconeSearchTool instance with mocked clients"""
    with patch.dict(os.environ, {
        'PINECONE_API_KEY': 'test-key',
        'OPENAI_API_KEY': 'test-key'
    }):
        tool = PineconeSearchTool()
        return tool


class TestPineconeSearchTool:
    """Test cases for PineconeSearchTool"""
    
    def test_list_indices(self, pinecone_tool):
        """Test listing Pinecone indices"""
        indices = pinecone_tool.list_indices()
        
        assert len(indices) == 1
        assert indices[0]["name"] == "test-index"
        assert indices[0]["dimension"] == 1536
        assert indices[0]["total_vectors"] == 100
    
    def test_search_documents(self, pinecone_tool):
        """Test searching documents"""
        results = pinecone_tool.search_documents(
            query="What is artificial intelligence?",
            index_name="test-index",
            top_k=5
        )
        
        assert len(results) == 1
        assert isinstance(results[0], SearchResult)
        assert results[0].score == 0.95
        assert "artificial intelligence" in results[0].text
        assert results[0].source == "test-index/test.pdf"
    
    def test_query_knowledge_base(self, pinecone_tool):
        """Test querying knowledge base with RAG"""
        result = pinecone_tool.query_knowledge_base(
            question="What is artificial intelligence?",
            indices=["test-index"],
            context_window=3
        )
        
        assert "answer" in result
        assert "sources" in result
        assert "confidence" in result
        assert len(result["sources"]) == 1
        assert result["confidence"] > 0
        assert "artificial intelligence" in result["answer"]
    
    def test_search_all_indices(self, pinecone_tool):
        """Test searching across all indices when none specified"""
        results = pinecone_tool.search_documents(
            query="test query",
            index_name=None,  # Search all indices
            top_k=5
        )
        
        assert len(results) == 1
        assert results[0].source == "test-index/test.pdf"


@pytest.mark.asyncio
class TestPineconeAPIEndpoints:
    """Test cases for Pinecone API endpoints"""
    
    @patch('src.tools.pinecone_search.PineconeSearchTool')
    async def test_query_endpoint(self, mock_tool_class):
        """Test the /api/pinecone/query endpoint"""
        # Mock the tool instance
        mock_tool = Mock()
        mock_tool.query_knowledge_base.return_value = {
            "answer": "Test answer",
            "sources": [{"source": "test.pdf", "score": 0.95, "metadata": {}}],
            "confidence": 0.95,
            "chunks_used": 1
        }
        mock_tool_class.return_value = mock_tool
        
        from fastapi.testclient import TestClient
        import sys
        sys.path.append('/root/deer-flow')
        from src.server.pinecone_routes import router
        from fastapi import FastAPI
        
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)
        
        response = client.post("/query", json={
            "question": "What is AI?",
            "context_chunks": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Test answer"
        assert len(data["sources"]) == 1
        assert data["confidence"] == 0.95


if __name__ == "__main__":
    # Simple test runner
    import unittest
    
    # Test basic functionality
    print("Testing Pinecone QnA Implementation...")
    
    # Check if environment variables are set
    if not os.getenv("PINECONE_API_KEY"):
        print("⚠️  PINECONE_API_KEY not set - using mock tests only")
    
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  OPENAI_API_KEY not set - using mock tests only")
    
    print("✅ Pinecone QnA tests can be run with: pytest tests/integration/test_pinecone_qna.py")
    
    # Test imports
    try:
        from src.tools.pinecone_search import PineconeSearchTool, search_pinecone_documents
        print("✅ Pinecone search tools imported successfully")
    except ImportError as e:
        print(f"❌ Import error: {e}")
    
    try:
        from src.agents.agents import research_agent
        print("✅ Research agent with Pinecone tools loaded successfully")
    except ImportError as e:
        print(f"❌ Agent import error: {e}")