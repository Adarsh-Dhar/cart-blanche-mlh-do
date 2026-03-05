# Serve ADK dev-ui static files for local development
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


from fastapi import Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
import uuid

app = FastAPI()

# --- CORS Middleware for local frontend integration ---
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the dev-ui assets in the ADK package
ADK_DEV_UI_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    ".venv",
    "lib",
    "python3.12",
    "site-packages",
    "google",
    "adk",
    "cli",
    "browser"
)

# Mount /dev-ui to serve the static files
if os.path.isdir(ADK_DEV_UI_PATH):
    app.mount("/dev-ui", StaticFiles(directory=ADK_DEV_UI_PATH), name="dev-ui")


# Optionally, add a root endpoint for testing
default_message = {"message": "ADK dev-ui static server running."}
@app.get("/")
def root():
    return default_message

# --- Placeholder for /run_sse endpoint ---
@app.post("/run_sse")
async def run_sse(request: Request):
    # This is a placeholder for server-sent events logic
    def event_stream():
        yield "data: SSE endpoint placeholder\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")

# --- Placeholder for session endpoints ---
sessions = {}

@app.post("/apps/shopping_concierge/users/user/sessions")
async def create_session():
    session_id = str(uuid.uuid4())
    sessions[session_id] = {"id": session_id, "status": "created"}
    return {"session_id": session_id}

@app.get("/apps/shopping_concierge/users/user/sessions")
async def list_sessions():
    return list(sessions.values())

@app.get("/apps/shopping_concierge/users/user/sessions/{session_id}")
async def get_session(session_id: str):
    session = sessions.get(session_id)
    if session:
        return session
    return JSONResponse(status_code=404, content={"detail": "Session not found"})
