from gradientai import Gradient
from .ucp_search_tool import UCPCommerceSearchTool

class ShoppingAgent:
    def __init__(self):
        self.gradient = Gradient()
        self.base_model = self.gradient.get_base_model(base_model_slug="llama2-7b-chat")

    async def run(self, prompt):
        response = self.base_model.complete(query=prompt)
        if "tool" in response:
            tool_output = self.call_tool(response["tool"], response["query"])
            return tool_output
        return response

    def call_tool(self, tool_name, query):
        if tool_name == "ucp_commerce_search":
            return UCPCommerceSearchTool().search(query)
        raise ValueError(f"Unknown tool: {tool_name}")