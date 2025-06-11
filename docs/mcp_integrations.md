# MCP Integrations

This guide explains how to add and configure MCP (Model Context Protocol) servers in Claude Deep Research.

## What is MCP?

MCP (Model Context Protocol) is an open protocol that enables AI assistants to connect to external data sources and tools. It provides a standardized way for AI models to interact with various services, databases, and APIs.

## Adding MCP Servers

There are two ways to add MCP servers to Deer Flow:

### 1. Frontend Configuration (User Settings)
Users can add MCP servers through the Settings dialog in the UI. These are stored in the browser's localStorage.

### 2. Backend Configuration (System-wide)
Administrators can configure MCP servers in the `conf.yaml` file that will be available to all users automatically.

#### Backend Configuration Example

Edit your `conf.yaml` file and add MCP servers under the `MCP_SERVERS` section:

```yaml
# MCP Server Configuration
MCP_SERVERS:
  # Example stdio server
  filesystem:
    name: "Filesystem"
    transport: "stdio"
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem"]
    env:
      FILESYSTEM_ROOT: "/path/to/root"
    enabled: true
    add_to_agents: ["researcher", "coder"]  # Optional: specify which agents can use this
  
  # Example SSE server
  weather:
    name: "Weather API"
    transport: "sse"
    url: "http://localhost:3000/sse"
    enabled: true
    add_to_agents: ["researcher"]
  
  # Example GitHub trending server
  github-trending:
    name: "GitHub Trending"
    transport: "stdio"
    command: "uvx"
    args: ["mcp-github-trending"]
    enabled: true
```

**Key Configuration Options:**
- `name`: Display name for the MCP server
- `transport`: Either "stdio" or "sse"
- `command`: (stdio only) The command to execute
- `args`: (stdio only) Command arguments
- `url`: (sse only) The SSE endpoint URL
- `env`: Environment variables for the server
- `enabled`: Whether this server is active
- `add_to_agents`: Optional list of agents that can use this server

Backend-configured servers will:
- Load automatically when the server starts
- Be available to all users
- Appear in the @ mentions dropdown
- Work alongside any user-configured servers

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

### Get Backend MCP Servers

**GET /api/mcp/backend-servers**

Returns all MCP servers configured in the backend:
```json
{
  "servers": [
    {
      "transport": "stdio",
      "name": "Filesystem",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {"FILESYSTEM_ROOT": "/path/to/root"},
      "tools": [
        {
          "name": "read_file",
          "description": "Read contents of a file"
        }
      ]
    }
  ]
}
```

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