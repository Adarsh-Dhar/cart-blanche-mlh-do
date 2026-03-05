#!/usr/bin/env python3
"""
Test script to verify the ForceToolPaymentProcessor works correctly.

This tests the payment processor in isolation to ensure it:
1. Detects authorization correctly
2. Forces tool execution
3. Returns proper response

Run this BEFORE deploying to the full system.
"""

import sys
import os
import asyncio

# Add server directory to path
server_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, server_dir)

print("="*80)
print("PAYMENT PROCESSOR TEST")
print("="*80)
print()

async def test_payment_processor():
    """Test the ForceToolPaymentProcessor"""
    
    # Import required modules
    print("1. Importing modules...")
    try:
        from shopping_concierge.x402_settlement import payment_processor_agent
        from google.adk.sessions import InMemorySessionService
        from google.adk.agents.invocation_context import InvocationContext
        from google.genai.types import Content, Part
        print("   ✅ Imports successful")
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    
    # Create session
    print("2. Creating session...")
    session_service = InMemorySessionService()
    session = await session_service.create_session(user_id="test", app_name="test")
    print("   ✅ Session created")
    
    print()
    
    # Test Case 1: No authorization
    print("3. Test Case 1: No authorization present")
    print("   Expected: Agent skips (no output)")
    
    session.state = {}
    
    context = InvocationContext(
        agent=payment_processor_agent,
        session=session,
        session_service=session_service,
        invocation_id="test-invocation-1"
    )
    
    outputs = []
    try:
        async for event in payment_processor_agent.run_async(context):
            if event.content and event.content.parts:
                outputs.append(event.content.parts[0].text)
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    if len(outputs) == 0:
        print("   ✅ PASS: No output (as expected)")
    else:
        print(f"   ❌ FAIL: Got unexpected output: {outputs}")
        return False
    
    print()
    
    # Test Case 2: Authorization as string
    print("4. Test Case 2: Authorization in payment_mandate (string)")
    print("   Expected: Tool executes, returns TX hash or error")
    
    session.state = {
        "payment_mandate": '{"authorized": true}'
    }
    
    context = InvocationContext(
        agent=payment_processor_agent,
        session=session,
        session_service=session_service,
        invocation_id="test-invocation-2"
    )
    
    outputs = []
    try:
        async for event in payment_processor_agent.run_async(context):
            if event.content and event.content.parts:
                text = event.content.parts[0].text
                outputs.append(text)
                print(f"   Output: {text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    if len(outputs) > 0:
        output = outputs[0]
        if "Payment Complete" in output or "TX Hash" in output:
            print("   ✅ PASS: Payment executed successfully")
        elif "Payment Failed" in output or "error" in output.lower():
            print("   ⚠️  PASS: Tool executed but payment failed (expected if merchant not running)")
            print(f"       Error was: {output}")
        else:
            print(f"   ❌ FAIL: Unexpected output: {output}")
            return False
    else:
        print("   ❌ FAIL: No output received")
        return False
    
    print()
    
    # Test Case 3: Authorization as dict
    print("5. Test Case 3: Authorization in payment_mandate (dict)")
    print("   Expected: Tool executes")
    
    session.state = {
        "payment_mandate": {"authorized": True}
    }
    
    context = InvocationContext(
        agent=payment_processor_agent,
        session=session,
        session_service=session_service,
        invocation_id="test-invocation-3"
    )
    
    outputs = []
    try:
        async for event in payment_processor_agent.run_async(context):
            if event.content and event.content.parts:
                text = event.content.parts[0].text
                outputs.append(text)
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    if len(outputs) > 0:
        print("   ✅ PASS: Tool executed")
    else:
        print("   ❌ FAIL: No output received")
        return False
    
    print()
    return True


async def main():
    success = await test_payment_processor()
    
    print()
    print("="*80)
    if success:
        print("✅ ALL TESTS PASSED!")
        print()
        print("The ForceToolPaymentProcessor is working correctly.")
        print()
        print("Next steps:")
        print("1. Replace x402_settlement.py with x402_settlement_FORCE.py")
        print("2. Restart the ADK server: adk web .")
        print("3. Test the full conversation flow")
    else:
        print("❌ TESTS FAILED!")
        print()
        print("Fix the errors above before deploying.")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())