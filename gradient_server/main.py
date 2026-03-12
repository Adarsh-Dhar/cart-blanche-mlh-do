import os
from gradient_adk import entrypoint, RequestContext
from dotenv import load_dotenv

# Import your existing orchestrator
# (Make sure shopping_concierge folder is in the same directory)
from shopping_concierge.conductor import shopping_concierge

load_dotenv()

@entrypoint
async def main(payload: dict, context: RequestContext):
    """
    This replaces your old FastAPI routes.
    The 'payload' is the JSON body sent from your frontend.
    """
    user_message = payload.get("message", "")
    thread_id = payload.get("thread_id", "default-thread")
    
    # Configuration for your existing LangGraph setup
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Invoke your existing orchestrator logic
        # Based on your conductor.py:
        final_state = await shopping_concierge.ainvoke(
            {"messages": [("user", user_message)]}, 
            config=config
        )
        
        # Extract the last message content
        response_text = final_state["messages"][-1].content
        
        return {
            "status": "success",
            "response": response_text,
            "data": final_state.get("cart_items", []) # If your state stores this
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }