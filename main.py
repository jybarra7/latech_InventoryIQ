"""InventoryIQ FastAPI backend entry point.
Run with: uvicorn main:app --reload
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.forecast_routes import router as forecast_router
from api.alert_routes import router as alert_router

app = FastAPI(
    title="InventoryIQ",
    description="AI-powered retail forecasting engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)
app.include_router(alert_router)

frontend_dist = Path("frontend/dist")

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"

    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            return {"detail": "Not Found"}

        requested_path = frontend_dist / full_path

        if requested_path.exists() and requested_path.is_file():
            return FileResponse(requested_path)

        return FileResponse(frontend_dist / "index.html")

else:
    @app.get("/")
    def root():
        return {"status": "ok", "product": "InventoryIQ"}
