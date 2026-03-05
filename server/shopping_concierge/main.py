# main.py (Root-level entry point for Google ADK)
from .conductor import conductor
from .x402_settlement import payment_processor_agent

# The ADK looks specifically for this variable name
AGENTS = [conductor, payment_processor_agent]
