# Pinecone MCP Server

A Model Context Protocol (MCP) server that provides document search and question-answering capabilities using Pinecone vector database.

## Features

- **Document Search**: Semantic search through uploaded documents
- **Q&A with RAG**: Retrieval-Augmented Generation for answering questions from your knowledge base
- **Index Management**: List and manage document collections

## Available Tools

### 1. `search_documents`
Search through uploaded documents using semantic similarity.

**Parameters:**
- `query` (required): Natural language search query
- `index_name` (optional): Specific index to search
- `top_k` (optional): Number of results to return (default: 5)

**Example:**
```
@documents.search_documents What are the latest trends in AI?
```

### 2. `query_knowledge_base`
Answer questions using RAG over uploaded documents.

**Parameters:**
- `question` (required): Question to answer
- `index_name` (optional): Specific index to search
- `context_chunks` (optional): Number of context chunks (default: 3)

**Example:**
```
@documents.query_knowledge_base What are the main benefits of SaaS?
```

### 3. `list_indices`
List all available document collections with statistics.

**Example:**
```
@documents.list_indices
```

## Setup

### Prerequisites

1. **Pinecone API Key**: Get from [Pinecone](https://www.pinecone.io/)
2. **OpenAI API Key**: Get from [OpenAI](https://platform.openai.com/api-keys)

### Environment Variables

```bash
export PINECONE_API_KEY="your-pinecone-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

### Installation

The server is automatically installed as part of the Deer Flow system. Dependencies are managed via the main project's `uv.lock`.

## Configuration

Add to your `conf.yaml`:

```yaml
MCP_SERVERS:
  documents:
    name: "Documents"
    transport: "stdio"
    command: "uv"
    args: ["run", "python", "mcp-servers/pinecone-mcp/mcp-server.py"]
    env:
      PINECONE_API_KEY: "${PINECONE_API_KEY}"
      OPENAI_API_KEY: "${OPENAI_API_KEY}"
    enabled: true
    add_to_agents: ["researcher"]
```

## Usage

### In Chat Interface

Once configured, you can use the document tools via @ mentions:

```
@documents.search_documents latest AI research papers
@documents.query_knowledge_base What is the impact of AI on healthcare?
@documents.list_indices
```

### Direct API Usage

The tools are also available through the MCP protocol for programmatic access.

## Error Handling

The server includes comprehensive error handling:

- **Missing API Keys**: Clear error messages for missing environment variables
- **No Documents**: Helpful messages when no documents are uploaded
- **Search Failures**: Graceful handling of search errors
- **Invalid Parameters**: Validation of required parameters

## Architecture

The server acts as a bridge between:

1. **MCP Protocol**: Standard interface for tool communication
2. **Pinecone Tools**: Existing document search infrastructure
3. **Chat Interface**: @ mention system for easy access

```
Chat Interface → MCP Protocol → Pinecone MCP Server → Pinecone Tools → Vector Database
```

## Development

### Running Tests

```bash
cd mcp-servers/pinecone-mcp
uv run pytest
```

### Code Formatting

```bash
uv run black .
uv run isort .
```

### Type Checking

```bash
uv run mypy .
```

## Troubleshooting

### Common Issues

1. **"Pinecone tool not initialized"**
   - Check that `PINECONE_API_KEY` and `OPENAI_API_KEY` are set
   - Verify API keys are valid

2. **"No relevant documents found"**
   - Upload documents using the paperclip icon in chat
   - Wait for processing to complete
   - Check index status with `@documents.list_indices`

3. **MCP server not responding**
   - Check server logs in Docker container
   - Verify configuration in `conf.yaml`
   - Restart the backend service

### Logs

Server logs are available in the Docker container:

```bash
docker-compose logs backend | grep pinecone-mcp
```

## License

MIT License - see main project LICENSE file.