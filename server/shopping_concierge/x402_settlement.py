# Fix for UnboundLocalError: import Content, Part, and Event
from google.genai.types import Content, Part
from google.adk.events import Event
from google.adk.agents import LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.genai.types import Content, Part, FunctionCall
from typing import AsyncIterator

from .x402_settlement_tool import X402SettlementTool
from pydantic import PrivateAttr
import json
import re

class ForceToolPaymentProcessor(LlmAgent):
    """
    Custom payment processor that FORCES tool execution when authorization is detected.
    
    This bypasses the LLM's decision-making and directly calls the x402_settlement tool
    when {"authorized": true} is detected in the conversation.
    """
    
    _settlement_tool: X402SettlementTool = PrivateAttr(default=None)

    def __init__(self):
        super().__init__(
            name="PaymentProcessorAgent",
            model="gemini-2.5-flash",
            instruction="""
            You execute x402 payments by calling the x402_settlement tool.
            When you see {"authorized": true}, call the tool immediately.
            """,
            tools=[],  
            output_key="settlement_receipt"
        )
        self._settlement_tool = X402SettlementTool()
        self.tools = [self._settlement_tool]
    
    async def run_async(self, context: InvocationContext) -> AsyncIterator:
        print("\n" + "="*80)
        print("[PAYMENT_PROCESSOR] Agent starting...")
        print("="*80)

        payment_mandate_raw = context.session.state.get("payment_mandate")
        authorization_found = False
        signature = None


        # 1. Extract the Signature
        if payment_mandate_raw:
            if isinstance(payment_mandate_raw, str):
                if '"authorized": true' in payment_mandate_raw or '"authorized":true' in payment_mandate_raw:
                    authorization_found = True
                    try:
                        parsed = json.loads(payment_mandate_raw)
                        signature = parsed.get("signature")
                    except:
                        pass
            elif isinstance(payment_mandate_raw, dict):
                if payment_mandate_raw.get("authorized") is True:
                    authorization_found = True
                    signature = payment_mandate_raw.get("signature")

        # 🚨 THE FIX: Traverse backwards to find the raw MetaMask signature directly!
        if not signature and hasattr(context.session, 'events') and context.session.events:
            for event in reversed(context.session.events):
                if hasattr(event, 'content') and event.content and hasattr(event.content, 'parts') and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            text = part.text.strip()
                            # Check 1: The requested JSON flag
                            if '"authorized": true' in text or '"authorized":true' in text:
                                authorization_found = True
                                try:
                                    parsed = json.loads(text)
                                    signature = parsed.get("signature")
                                except:
                                    pass
                            # Check 2: Raw regex extraction (bypasses LLM hallucinations)
                            sig_match = re.search(r'(0x[a-fA-F0-9]{130,})', text)
                            if sig_match and not signature:
                                authorization_found = True
                                signature = sig_match.group(1)
                if signature:
                    break

        if authorization_found and signature:
            print(f"[PAYMENT_PROCESSOR] ✅ AUTHORIZATION FOUND! Signature extracted: {str(signature)[:15]}...")
            
            # 2. Extract the CartMandate from the conversation history
            cart_mandate = None
            if hasattr(context.session, 'events') and context.session.events:
                # Traverse backwards to find the last valid JSON block
                for event in reversed(context.session.events):
                    if hasattr(event, 'content') and event.content and hasattr(event.content, 'parts') and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                text = part.text
                                json_matches = re.findall(r'```(?:json)?\n([\s\S]*?)\n```', text)
                                
                                # If no markdown blocks, try searching for raw JSON objects
                                if not json_matches:
                                     try:
                                         # Find everything between the first { and the last }
                                         raw_json_match = re.search(r'(\{[\s\S]*\})', text)
                                         if raw_json_match:
                                             json_matches = [raw_json_match.group(1)]
                                     except:
                                         pass

                                for match in reversed(json_matches): 
                                    try:
                                        payload = json.loads(match)
                                        # Handle the new Batch structure
                                        if "merchants" in payload and isinstance(payload["merchants"], list):
                                            cart_mandate = {
                                                "total_budget": payload.get("total_budget_amount"),
                                                "currency": payload.get("currency", "USDC"),
                                                "chain_id": payload.get("chain_id", 324705682), # 🚨 ADD THIS LINE!
                                                "merchants": payload["merchants"]
                                            }
                                        # Handle if wrapped
                                        elif "cart_mandate" in payload:
                                            cart_mandate = payload["cart_mandate"]
                                        # Handle if wrapped in message
                                        elif "message" in payload and isinstance(payload["message"], dict):
                                            msg = payload["message"]
                                            if "merchant_address" in msg and "amount" in msg:
                                                cart_mandate = {
                                                    "merchant_address": msg.get("merchant_address"),
                                                    "amount": msg.get("amount"),
                                                    "currency": msg.get("currency", "USDC"),
                                                    "chain_id": msg.get("chain_id", 324705682)
                                                }
                                        # Handle if flat
                                        elif "merchant_address" in payload and "amount" in payload:
                                            cart_mandate = {
                                                "merchant_address": payload.get("merchant_address"),
                                                "amount": payload.get("amount"),
                                                "currency": payload.get("currency", "USDC"),
                                                "chain_id": payload.get("chain_id", 324705682)
                                            }
                                        if cart_mandate:
                                            break
                                    except:
                                        pass
                            if cart_mandate:
                                break
                    if cart_mandate:
                        break

            if not cart_mandate:
                print("[PAYMENT_PROCESSOR] ❌ Failed to extract cart_mandate from chat history!")
                from google.adk.events import Event
                error_content = Content(role="model", parts=[Part(text="❌ Payment processor error: Could not find original mandate in chat history.")])
                yield Event(invocation_id=context.invocation_id, author=self.name, content=error_content)
                return

            print("[PAYMENT_PROCESSOR] 🚀 FORCING TOOL EXECUTION...")
            
            # 3. Combine the extracted data
            combined_payload = {
                "signature": signature,
                "cart_mandate": cart_mandate,
                # Remove the hardcoded check. The settlement tool will recover the address 
                # from the signature and use THAT as the verified user identity.
                "user_wallet_address": None 
            }

            try:
                print("[PAYMENT_PROCESSOR] Calling x402_settlement tool directly...")
                result = await self._settlement_tool.run_async(
                    args={"payment_mandate": combined_payload},
                    tool_context=None
                )
                print(f"[PAYMENT_PROCESSOR] ✅ Tool returned: {result}")
                receipts = result.get("receipts", [])
                if receipts:
                    # 1. Create a JSON block for the frontend to parse automatically
                    receipt_json = json.dumps(result, indent=2)
                    # 2. Format a message that includes the JSON
                    msg = f"✅ **Payment Complete!**\n\nYour transactions have been securely settled on the SKALE network.\n\n```json\n{receipt_json}\n```"

                    from google.adk.events import Event
                    from google.genai.types import Content, Part

                    success_content = Content(role="model", parts=[Part(text=msg)])
                    yield Event(
                        invocation_id=context.invocation_id,
                        author=self.name,
                        content=success_content
                    )
                    return
                else:
                    response_text = f"❌ Payment Failed: {result.get('reason', 'Unknown error')}"
                    context.session.state["settlement_receipt"] = result
                    from google.adk.events import Event
                    response_content = Content(role="model", parts=[Part(text=response_text)])
                    yield Event(
                        invocation_id=context.invocation_id,
                        author=self.name,
                        content=response_content
                    )
            except Exception as e:
                print(f"[PAYMENT_PROCESSOR] ❌ ERROR calling tool: {e}")
                import traceback
                traceback.print_exc()
                from google.adk.events import Event
                error_content = Content(role="model", parts=[Part(text=f"❌ Payment processor error: {e}")])
                yield Event(
                    invocation_id=context.invocation_id,
                    author=self.name,
                    content=error_content
                )
        else:
            print("[PAYMENT_PROCESSOR] ❌ No authorization found. Skipping payment.")


# ==============================================================================
# 🚨 IMPORTANT: This instantiation MUST stay at the very bottom of the file! 🚨
# ==============================================================================
payment_processor_agent = ForceToolPaymentProcessor()

print("="*80)
print("[x402_settlement.py] ForceToolPaymentProcessor initialized")
print("="*80)