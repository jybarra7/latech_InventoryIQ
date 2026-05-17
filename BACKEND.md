# InventoryIQ — Backend API Documentation

## Running Locally

# in bash
git clone https://github.com/jybarra7/latech_InventoryIQ
cd latech_InventoryIQ
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn python-multipart
# add GEMINI_API_KEY to your .env locally
uvicorn main:app --reload
# interactive docs at http://localhost:8000/docs

---

# Current Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/forecast/run` | Runs all 4 models, returns benchmark comparison and winning model |
| POST | `/forecast/future` | Generates forward-looking LightGBM forecast |
| POST | `/forecast/kpis` | Returns KPI summary row for dashboard cards |
| POST | `/alerts/run` | Runs all 3 alert detectors, returns severity-sorted alerts |

All POST endpoints accept a retail CSV uploaded as multipart form data.

---

### Request / Response Examples

## POST `/forecast/run`
# Request: multipart form upload of retail CSV

# Response:
```json
{
  "winner": "lightgbm_global_lag",
  "metrics": {
    "mae": 5.882,
    "rmse": 7.639,
    "mase": 0.715
  },
  "comparison_table": [
    { "method_name": "lightgbm_global_lag", "mae": 5.882, "rmse": 7.639, "mase": 0.715 },
    { "method_name": "feature_based_regression", "mae": 7.574, "rmse": 9.742, "mase": 0.920 },
    { "method_name": "rolling_average_3", "mae": 11.911, "rmse": 15.668, "mase": 1.447 },
    { "method_name": "naive_last_value", "mae": 13.270, "rmse": 17.653, "mase": 1.612 }
  ]
}
```

---

## POST `/forecast/future`
# Request: multipart form upload of retail CSV + optional `?future_days=30`

# Response:
```json
{
  "method": "lightgbm_global_lag",
  "future_days": 30,
  "forecast_records": [
    {
      "date": "2018-01-01",
      "store": 1,
      "item": 1,
      "actual": null,
      "prediction": 47.2,
      "residual": null,
      "method_name": "lightgbm_global_lag"
    }
  ]
}
```

---

## POST `/forecast/kpis`
# Request: multipart form upload of retail CSV + optional `?future_days=30`

# Response:
```json
{
  "total_sales": 47704512.0,
  "forecast_direction": "increasing",
  "winner_model": "lightgbm_global_lag",
  "mae": 5.882
}
```

**Note:** `winner_model` and `mae` currently require `/forecast/run` to be called first. 
## Known issue — needs a small wiring fix ##

---

## What's Still Missing for Full Dashboard Parity

| Endpoint          |            Description                    |    Owner |
|--------------------|------------------------------------------|--------------|
| `POST /summary/generate` | Gemini AI summary — wraps `utils/ai_summary.py` | TBD |
| `POST /data/upload` | Schema mapping and retail_clean generation | Andrew |
| Filter support | Server-side filtering by date, category, store | TBD |