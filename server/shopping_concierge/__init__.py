# 1. Import your main orchestrator (conductor)
from .conductor import conductor

from .x402_settlement import payment_processor_agent

# 🚨 CRITICAL FIX: The ADK explicitly looks for the exact variable name 'agent'
agent = conductor
root_agent = conductor

# 3. Keep your existing sub-agent exports
from .shopping_agent import shopping_agent
from .merchant_agent import merchant_agent

from .adk_context_utils import SESSION_SERVICE, get_or_create_session, build_invocation_context

# 4. Silence Pylance by explicitly declaring what this module exports
__all__ = [
	"conductor",
	"root_agent",
	"agent",
	"shopping_agent",
	"merchant_agent",
	"SESSION_SERVICE",
	"get_or_create_session",
	"build_invocation_context"
]
print("[DEBUG] ADK Discovery variables successfully loaded!")