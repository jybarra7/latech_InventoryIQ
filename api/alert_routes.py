"""FastAPI routes for the alert engine.

Thin routes - all business logic lives in models/alerter.py.
"""

from __future__ import annotations

import io
import re

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from models.alerter import run_all_alerts

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

        def normalize_col(name: str) -> str:
            name = str(name).strip().lower()
            name = re.sub(r"[\s\-\/]+", "_", name)
            name = re.sub(r"[^a-z0-9_]", "", name)
            name = re.sub(r"_+", "_", name).strip("_")
            return name

        df.columns = [normalize_col(col) for col in df.columns]

        rename_map = {}

        if "store_id" not in df.columns:
            for candidate in ["store", "store_id", "store_name", "store_number", "branch"]:
                if candidate in df.columns:
                    rename_map[candidate] = "store_id"
                    break

        if "product_id" not in df.columns:
            for candidate in ["product_id", "item_id", "sku"]:
                if candidate in df.columns:
                    rename_map[candidate] = "product_id"
                    break

        if "product_name" not in df.columns:
            for candidate in ["product_name", "item_name", "product", "item", "name", "description"]:
                if candidate in df.columns:
                    rename_map[candidate] = "product_name"
                    break

        if "date" not in df.columns:
            for candidate in ["date", "order_date", "transaction_date", "invoice_date", "sale_date"]:
                if candidate in df.columns:
                    rename_map[candidate] = "date"
                    break

        if "sales" not in df.columns:
            for candidate in ["sales", "revenue", "amount", "total", "price", "total_sales"]:
                if candidate in df.columns:
                    rename_map[candidate] = "sales"
                    break

        if rename_map:
            df = df.rename(columns=rename_map)

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
