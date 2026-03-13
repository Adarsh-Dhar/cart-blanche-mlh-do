from __future__ import annotations
import logging
from langchain_core.messages import AIMessage
from server.state import AgentState, MAX_STEPS
from server.tool.ucp_search import UCPCommerceSearchTool

logger = logging.getLogger(__name__)

_ucp_tool = UCPCommerceSearchTool()

async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT ---")
    steps = state.get("steps", 0)
    
    if steps >= MAX_STEPS:
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content="Search limit reached. Please start a new request.",
                name="ShoppingAgent",
            )],
        }

    plan = state.get("project_plan", "")
    budget = state.get("budget_usd", 0.0) or 0.0
    
    if not plan:
        print("No plan provided to shopping agent.")
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content="⚠️ No search plan found. Please describe what you need.",
                name="ShoppingAgent"
            )]
        }

    print(f"Executing plan: {plan}")
    print(f"Total Budget: ${budget}")

    categories = [c.strip() for c in plan.split(";") if c.strip()]
    category_options = {}

    # 1. Gather all available options per category
    for cat_str in categories:
        if ":" not in cat_str:
            continue
            
        cat_name, terms_str = cat_str.split(":", 1)
        search_terms = [t.strip() for t in terms_str.split(",")]
        
        print(f"\nProcessing Category: {cat_name}")
        category_results = []
        
        for term in search_terms:
            try:
                results = await _ucp_tool.run_async(args={"query": term}, tool_context=None)
                if results:
                    category_results.extend(results)
            except Exception as exc:
                print(f"  Warning: Query '{term}' failed: {exc}")

        if not category_results:
            print(f"  No products found for category '{cat_name}'.")
            continue

        # Dedup by product ID
        unique_results = []
        seen_ids = set()
        for p in category_results:
            if p["id"] not in seen_ids:
                seen_ids.add(p["id"])
                unique_results.append(p)

        # Sort by price (cheapest to most expensive)
        unique_results.sort(key=lambda x: x["price"])
        category_options[cat_name] = unique_results

    # 2. Base Selection: Pick the cheapest item for each category to ensure a COMPLETE list
    selected_items = {}
    current_total = 0.0
    
    for cat_name, options in category_options.items():
        cheapest = options[0]
        # Try to avoid blowing the budget on the very first pass
        if budget > 0 and current_total + cheapest["price"] > budget:
            if current_total == 0:
                # Add at least one item even if it exceeds the budget
                selected_items[cat_name] = cheapest
                current_total += cheapest["price"]
            else:
                print(f"  Warning: Skipping '{cat_name}' baseline to stay under budget.")
        else:
            selected_items[cat_name] = cheapest
            current_total += cheapest["price"]

    # 3. Upgrade Loop: Maximize the cart quality by upgrading items if we have remaining budget
    if budget > 0 and current_total < budget:
        made_upgrade = True
        while made_upgrade:
            made_upgrade = False
            for cat_name in list(selected_items.keys()):
                options = category_options[cat_name]
                current_item = selected_items[cat_name]
                
                # Find the index of the currently selected item
                current_idx = next(i for i, p in enumerate(options) if p["id"] == current_item["id"])
                
                # Check if there is a higher-tier (more expensive) option in this category
                if current_idx + 1 < len(options):
                    next_item = options[current_idx + 1]
                    price_diff = next_item["price"] - current_item["price"]
                    
                    # If the upgrade fits in the budget, swap it in and update the total
                    if current_total + price_diff <= budget:
                        selected_items[cat_name] = next_item
                        current_total += price_diff
                        made_upgrade = True

    final_selection = list(selected_items.values())
    print(f"\nFinished Shopping. Selected {len(final_selection)} items. Total: ${current_total:.2f}")

    # 4. Format the response for the UI
    if not final_selection:
        reply = (
            "⚠️ No in-stock products found for your request.\n\n"
            "Try broadening your search — for example, use generic terms "
            "like *'headphones'* instead of a specific brand."
        )
    else:
        lines = [f"| {'#':<3} | {'Product':<38} | {'Vendor':<22} | {'Price':>8} |"]
        lines.append(f"|{'-'*5}|{'-'*40}|{'-'*24}|{'-'*10}|")
        for i, p in enumerate(final_selection, 1):
            vendor_name = p.get('vendor', 'Unknown')
            lines.append(
                f"| {i:<3} | {p['name'][:38]:<38} | "
                f"{vendor_name[:22]:<22} | ${p['price']:>7.2f} |"
            )
        table = "\n".join(lines)
        
        budget_warning = ""
        if budget > 0 and current_total > budget:
            budget_warning = f"\n\n⚠️ **Budget note:** The total exceeds your stated budget of **${budget:.0f}**. I selected the most affordable options available."
            
        reply = (
            f"Found **{len(final_selection)}** optimized product(s) matching your request:\n\n"
            f"```\n{table}\n```\n\n"
            f"**Estimated total: ${current_total:.2f}**{budget_warning}\n\n"
            "Reply **'Looks good'** to confirm this cart and proceed to payment, "
            "or describe what you'd like to change."
        )

    return {
        "product_list": final_selection,
        "_shopped": True,
        "steps": steps + 1,
        "messages": [AIMessage(content=reply, name="ShoppingAgent")]
    }