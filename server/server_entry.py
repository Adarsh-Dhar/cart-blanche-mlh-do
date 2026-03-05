import os
import sys
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from google.adk.cli.fast_api import get_fast_api_app

# 1. We must point to the parent directory of 'shopping_concierge'
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

print("\n================================================================================")
print(f"[server_entry.py] Booting up ADK Server. Scanning directory: {current_dir}")

# 2. Start the app. The ADK will look inside 'current_dir' and find the 'shopping_concierge' folder.
app = get_fast_api_app(agents_dir=current_dir, web=False)

# 3. Add CORS so your Next.js app can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Print the routes to guarantee /run_sse was registered
print("\n🚨 REGISTERED FASTAPI ROUTES 🚨")
for route in app.routes:
    if hasattr(route, "path") and "run_sse" in route.path:
         print(f"✅ FOUND ROUTE: {route.path}")
print("================================================================================\n")

if __name__ == "__main__":
    uvicorn.run("server_entry:app", host="0.0.0.0", port=8000, reload=True)