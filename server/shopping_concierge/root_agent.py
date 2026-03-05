# shopping_concierge/root_agent.py
# Expose the root agent for ADK auto-discovery
from .conductor import conductor

# The ADK expects a variable named 'root_agent' for auto-discovery
root_agent = conductor
