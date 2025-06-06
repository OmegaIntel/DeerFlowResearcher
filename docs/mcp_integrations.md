# MCP Integrations

## Example of MCP Server Configuration

### Traditional MCP Server (Legacy)
```json
{
  "mcpServers": {
    "mcp-github-trending": {
      "transport": "stdio",
      "command": "uvx",
      "args": [
          "mcp-github-trending"
      ]
    }
  }
}
```

### OpenAI Responses API Server (New)
```json
{
  "mcpServers": {
    "octagon-agent": {
      "transport": "openai-responses",
      "api_key": "sk_l**************************************************************************************JyGg",
      "base_url": "https://api-gateway.octagonagents.com/v1",
      "model": "octagon-agent"
    }
  }
}
```

### MindsDB MCP Server
```json
{
  "mcpServers": {
    "mindsdb": {
      "transport": "sse",
      "url": "http://localhost:47334/api/mcp/sse",
      "env": {
        "MINDSDB_USERNAME": "mindsdb",
        "MINDSDB_PASSWORD": "your_password",
        "MINDSDB_API_KEY": "your_api_key"
      }
    }
  }
}
```

### MindsDB via HTTP API (Alternative)
```json
{
  "mcpServers": {
    "mindsdb-api": {
      "transport": "openai-responses",
      "api_key": "your_mindsdb_api_key",
      "base_url": "http://localhost:47334/api/v1",
      "model": "mindsdb-query"
    }
  }
}
```

## APIs

### Get metadata of MCP Server

**POST /api/mcp/server/metadata**

For `stdio` type:
```json
{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "tavily-mcp@0.1.3"],
  "env": {"TAVILY_API_KEY":  "tvly-dev-xxx"}
}
```

For `sse` type:
```json
{
  "transport": "sse",
  "url": "http://localhost:3000/sse",
  "env": {
    "API_KEY": "value"
  }
}
```

### Chat Stream

**POST /api/chat/stream**

#### Traditional MCP Server Configuration
```json
{
  ...
  "mcp_settings": {
    "servers": {
      "mcp-github-trending": {
        "transport": "stdio",
        "command": "uvx",
        "args": ["mcp-github-trending"],
        "env": {
          "MCP_SERVER_ID": "mcp-github-trending"
        },
        "enabled_tools": ["get_github_trending_repositories"],
        "add_to_agents": ["researcher"]
      }
    }
  },
}
```

#### OpenAI Responses API Configuration
```json
{
  ...
  "mcp_settings": {
    "servers": {
      "octagon-agent": {
        "transport": "openai-responses",
        "api_key": "sk_l**************************************************************************************JyGg",
        "base_url": "https://api-gateway.octagonagents.com/v1",
        "model": "octagon-agent"
      }
    }
  },
}
```

#### MindsDB MCP Configuration
```json
{
  ...
  "mcp_settings": {
    "servers": {
      "mindsdb": {
        "transport": "sse",
        "url": "http://localhost:47334/api/mcp/sse",
        "env": {
          "MINDSDB_USERNAME": "mindsdb",
          "MINDSDB_PASSWORD": "your_password",
          "MINDSDB_API_KEY": "your_api_key"
        },
        "enabled_tools": ["query_database", "create_predictor", "list_databases"],
        "add_to_agents": ["researcher", "coordinator"]
      }
    }
  }
}
```

### Chat Tool (@ mentions)

**POST /api/chat/tool**

Example request for using a specific tool:
```json
{
  "messages": [{"role": "user", "content": "Retrieve year-over-year growth in key income-statement items for AAPL"}],
  "tool_id": "octagon-agent.financial-data",
  "tool_type": "mcp",
  "mcp_settings": {
    "servers": {
      "octagon-agent": {
        "transport": "openai-responses",
        "api_key": "sk_l**************************************************************************************JyGg",
        "base_url": "https://api-gateway.octagonagents.com/v1",
        "model": "octagon-agent"
      }
    }
  }
}
```
