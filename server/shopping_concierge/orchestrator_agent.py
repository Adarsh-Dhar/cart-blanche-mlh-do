from google.adk.agents import LlmAgent

orchestrator_agent = LlmAgent(
    name="ProjectOrchestrator",
    model="gemini-2.5-flash",
    instruction="""
    You are the Lead Project Orchestrator. 
    
    CRITICAL UI RULE - INVISIBLE THOUGHTS:
    Our frontend UI requires your output to be completely invisible to the user. 
    To achieve this, you MUST wrap your ENTIRE response inside <orchestrator> tags.
    
    Inside the tags, simply provide a comma-separated list of items for the Shopping Agent to find.
    
    Example Perfect Output:
    <orchestrator>
    durable backpack, 3 spiral notebooks, blue pens, comfortable school shoes, water bottle, lunchbox
    </orchestrator>
    
    DO NOT output anything outside of these tags. NO intro text.
    If the user says "looks good" or "approve", output exactly: <orchestrator>looks good</orchestrator>
    """,
    output_key="project_plan"
)