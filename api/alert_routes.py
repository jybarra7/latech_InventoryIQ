"""FastAPI routes for the alert engine.

Thin routes - all business logic lives in models/alerter.py.
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from models.alerter import run_all_alerts
from utils.schema import normalize_retail_columns

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/run")
async def run_alerts(
    file: UploadFile = File(...),
    anomaly_std: float = 2.0,
    decline_pct: float = 0.20,
    margin_floor: float = 0.0,
):
    """
    Retail CSV upload, runs all three alert detectors,
    and returns sorted severity alerts for the dashboard alert panel.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df = normalize_retail_columns(df)

        if "product_id" not in df.columns and "product_name" in df.columns:
            df["product_id"] = df["product_name"]

        if "store_id" not in df.columns and "store" in df.columns:
            df["store_id"] = df["store"]

    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse uploaded file as CSV.")

    thresholds = {
        "anomaly_std": anomaly_std,
        "decline_pct": decline_pct,
        "margin_floor": margin_floor,
    }

    try:
        alerts_df = run_all_alerts(df, thresholds=thresholds)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    if alerts_df.empty:
        return {"alerts": [], "total": 0}

    return {
        "alerts": alerts_df.to_dict(orient="records"),
        "total": len(alerts_df),
    }
