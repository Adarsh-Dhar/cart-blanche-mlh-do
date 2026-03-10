from google.adk.tools.base_tool import BaseTool, ToolContext
from typing import Any
import httpx

class UCPCommerceSearchTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="ucp_commerce_search",
            description="Search for real products and vendors across the Universal Commerce Protocol (UCP)."
        )

    async def run_async(self, *, args: dict[str, Any], tool_context: ToolContext) -> Any:
        query = args.get("query")
        # Use the local UCP REST endpoint (update as needed)
        UCP_GATEWAY_URL = "http://localhost:8182/ucp/v1/search"
        print(f"[UCP_SEARCH] Querying UCP for: {query}")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(UCP_GATEWAY_URL, params={"q": query})
                response.raise_for_status()
                data = response.json()
                # Expecting data to be a list of products with required fields
                # Example expected structure:
                # [
                #   {"name": ..., "vendor": ..., "price": ..., "merchant_address": ...},
                #   ...
                # ]
                products = []
                for item in data:
                    products.append({
                        "name": item.get("name"),
                        "vendor": item.get("vendor"),
                        "price": item.get("price"),
                        "merchant_address": item.get("merchant_address")
                    })
                return products
        except Exception as e:
            return {"error": f"UCP Search failed: {str(e)}"}