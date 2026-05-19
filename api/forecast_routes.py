"""FastAPI routes for the forecast pipeline.

!Thin routes! (all business logic lives in services/forecast_service.py).
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from services.forecast_service import get_future_forecast, run_forecast_pipeline, shape_kpi_payload

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.post("/run")
async def run_forecast(file: UploadFile = File(...), horizon_days: int = 90):
    """
    Accepts a CSV data upload, runs all four forecasting models,
    and returns the benchmark comparison and winning model.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse uploaded file as CSV.")

    try:
        result = run_forecast_pipeline(df, horizon_days=horizon_days)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result


@router.post("/future")
async def future_forecast(file: UploadFile = File(...), future_days: int = 30):
    """
    Accepts a CSV upload and returns a forward-looking
    forecast for the dashboard chart.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse uploaded file as CSV.")

    try:
        result = get_future_forecast(df, future_days=future_days)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result


@router.post("/kpis")
async def forecast_kpis(file: UploadFile = File(...), future_days: int = 30):
    """
    Returns the KPI summary payload for the dashboard cards:
    total sales, forecast direction, winning model, and MAE (mean absolute error).
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse uploaded file as CSV.")

    try:
        forecast_result = get_future_forecast(df, future_days=future_days)
        kpis = shape_kpi_payload(df, forecast_result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return kpis