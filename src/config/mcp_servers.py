# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
from typing import Dict, List, Optional, Any
from src.config.loader import load_yaml_config

logger = logging.getLogger(__name__)


class MCPServerConfig:
    """Configuration for MCP servers loaded from backend."""
    
    def __init__(self):
        self.servers: Dict[str, Dict[str, Any]] = {}
        self.load_from_config()
    
    def load_from_config(self):
        """Load MCP servers from configuration file."""
        config = load_yaml_config("conf.yaml", use_cache=False)  # Don't cache env var configs
        mcp_servers = config.get("MCP_SERVERS", {})
        
        for server_id, server_config in mcp_servers.items():
            if server_config.get("enabled", False):
                self.servers[server_id] = {
                    "id": server_id,
                    "name": server_config.get("name", server_id),
                    "transport": server_config.get("transport", "stdio"),
                    "command": server_config.get("command"),
                    "args": server_config.get("args", []),
                    "url": server_config.get("url"),
                    "env": server_config.get("env", {}),
                    "add_to_agents": server_config.get("add_to_agents", []),
                    "tools": []  # Will be populated when tools are loaded
                }
                logger.info(f"Loaded MCP server configuration: {server_id}")
    
    async def load_tools_for_servers(self):
        """Load tools for all configured servers."""
        from src.server.mcp_utils import load_mcp_tools
        
        for server_id, server_config in self.servers.items():
            try:
                tools = await load_mcp_tools(
                    server_type=server_config["transport"],
                    command=server_config.get("command"),
                    args=server_config.get("args"),
                    url=server_config.get("url"),
                    env=server_config.get("env"),
                    timeout_seconds=60
                )
                
                # Convert tools to the format expected by frontend
                tool_list = []
                for tool in tools:
                    tool_dict = {
                        "name": tool.name,
                        "description": tool.description if hasattr(tool, 'description') else "",
                    }
                    if hasattr(tool, 'inputSchema') and tool.inputSchema:
                        tool_dict["inputSchema"] = tool.inputSchema
                    tool_list.append(tool_dict)
                
                server_config["tools"] = tool_list
                logger.info(f"Loaded {len(tool_list)} tools for server {server_id}")
            except Exception as e:
                logger.error(f"Failed to load tools for server {server_id}: {e}")
                server_config["tools"] = []
    
    def get_servers_for_frontend(self) -> List[Dict[str, Any]]:
        """Get server configurations in the format expected by frontend."""
        from src.config.loader import replace_env_vars
        frontend_servers = []
        
        for server_id, server_config in self.servers.items():
            frontend_server = {
                "id": server_id,  # Add server ID for frontend
                "transport": server_config["transport"],
                "name": server_config["name"],
                "enabled": True,  # Only enabled servers are loaded
                "tools": server_config["tools"],
            }
            
            if server_config["transport"] == "stdio":
                # Process environment variables in the response
                processed_env = {}
                for key, value in server_config.get("env", {}).items():
                    processed_env[key] = replace_env_vars(value) if isinstance(value, str) else value
                
                frontend_server.update({
                    "command": server_config["command"],
                    "args": server_config["args"],
                    "env": processed_env
                })
            elif server_config["transport"] == "sse":
                frontend_server["url"] = replace_env_vars(server_config["url"]) if isinstance(server_config["url"], str) else server_config["url"]
            
            frontend_servers.append(frontend_server)
        
        return frontend_servers
    
    def get_mcp_servers_dict(self) -> Dict[str, Dict[str, Any]]:
        """Get MCP servers in the format expected by MultiServerMCPClient."""
        from src.config.loader import replace_env_vars
        mcp_dict = {}
        
        for server_id, server_config in self.servers.items():
            # Process environment variables
            processed_env = {}
            for key, value in server_config.get("env", {}).items():
                processed_env[key] = replace_env_vars(value) if isinstance(value, str) else value
            
            mcp_dict[server_id] = {
                "transport": server_config["transport"],
                "command": server_config.get("command"),
                "args": server_config.get("args", []),
                "url": replace_env_vars(server_config.get("url")) if isinstance(server_config.get("url"), str) else server_config.get("url"),
                "env": processed_env
            }
        
        return mcp_dict


# Global instance
mcp_server_config = MCPServerConfig()