#!/usr/bin/env python3
"""Apply patches to fix llama-index bugs before starting MCP server"""

def apply_patches():
    try:
        import llama_index.indices.managed.llama_cloud.retriever as retriever
        
        file_path = retriever.__file__
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if already patched
        if "and results.page_figure_nodes is not None:" in content:
            return True  # Already patched
        
        # Fix the issue where results.page_figure_nodes might be None
        original = """        if self._retrieve_page_figure_nodes:
            result_nodes.extend(
                page_figure_nodes_to_node_with_score(
                    self._client, results.page_figure_nodes, self.project.id
                )
            )"""
        
        patched = """        if self._retrieve_page_figure_nodes and results.page_figure_nodes is not None:
            result_nodes.extend(
                page_figure_nodes_to_node_with_score(
                    self._client, results.page_figure_nodes, self.project.id
                )
            )"""
        
        if original in content:
            content = content.replace(original, patched)
        
        # Also fix the async version (note: there's a bug in the original where it passes results.image_nodes instead of results.page_figure_nodes)
        original_async = """        if self._retrieve_page_figure_nodes:
            result_nodes.extend(
                await apage_figure_nodes_to_node_with_score(
                    self._aclient, results.image_nodes, self.project.id
                )
            )"""
        
        patched_async = """        if self._retrieve_page_figure_nodes and results.page_figure_nodes is not None:
            result_nodes.extend(
                await apage_figure_nodes_to_node_with_score(
                    self._aclient, results.page_figure_nodes, self.project.id
                )
            )"""
        
        if original_async in content:
            content = content.replace(original_async, patched_async)
        
        # Save the patched file
        with open(file_path, 'w') as f:
            f.write(content)
        
        return True
        
    except Exception:
        return False

if __name__ == "__main__":
    if apply_patches():
        print("✅ Patches applied successfully")
    else:
        print("❌ Failed to apply patches")