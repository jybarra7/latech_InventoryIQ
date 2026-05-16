"""Forecast service layer for the InventoryIQ FastAPI backend.

utils/forecasting.py functions into clean service calls 
that FastAPI routes can call, avoiding any business logic.
"""

from __future__ import annotations

import pandas as pd

from utils.forecasting import (
    add_mase_to_results,
    build_lightgbm_future_forecast,
    compare_models,
    prepare_forecast_input,
    run_feature_regression,
    run_lightgbm_global_lag,
    run_naive_baseline,
    run_rolling_average_baseline,
    split_by_recent_dates,
)


DEFAULT_HORIZON_DAYS = 90
DEFAULT_FUTURE_DAYS = 30


def run_forecast_pipeline(df: pd.DataFrame, horizon_days: int = DEFAULT_HORIZON_DAYS) -> dict:
    """
    Runs all four forecasting models on DataFrame,
    benchmarks them, selects the strongest, and returns
    a payload the API route can return as JSON.

    Args:
        df: Clean retail DataFrame (retail_clean.csv schema)
        horizon_days: Number of days to hold out for testing (default 90)

    Returns:
        dict with keys: comparison_table, winner, metrics
    """
    prepared = prepare_forecast_input(df)
    train_df, test_df = split_by_recent_dates(prepared, horizon_days=horizon_days)

    group_cols = ["store", "item"]
    target_col = "sales"
    date_col = "date"

    naive = run_naive_baseline(train_df, test_df, group_cols, target_col, date_col)
    rolling = run_rolling_average_baseline(train_df, test_df, group_cols, target_col, date_col)
    regression = run_feature_regression(train_df, test_df, group_cols, target_col, date_col)
    lightgbm = run_lightgbm_global_lag(train_df, test_df, group_cols, target_col, date_col)

    results = [naive, rolling, regression, lightgbm]
    add_mase_to_results(results, train_df, group_cols, target_col, date_col)

    comparison = compare_models(results)
    winner_row = comparison[comparison["selected_winner"]].iloc[0]

    return {
        "winner": winner_row["method_name"],
        "metrics": {
            "mae": round(winner_row["mae"], 3),
            "rmse": round(winner_row["rmse"], 3),
            "mase": round(winner_row["mase"], 3) if "mase" in winner_row else None,
        },
        "comparison_table": comparison.drop(columns=["selected_winner"]).round(3).to_dict(orient="records"),
    }


def get_future_forecast(df: pd.DataFrame, future_days: int = DEFAULT_FUTURE_DAYS) -> dict:
    """
    Generates a forward-looking forecast using LightGBM trained
    on all available data. Used for the dashboard forecast chart.

    Args:
        df: Clean retail DataFrame (retail_clean.csv schema)
        future_days: Number of days to project forward (default 30)

    Returns:
        dict with keys: forecast_records, future_days, method
    """
    forecast_df = build_lightgbm_future_forecast(df, future_days=future_days)

    return {
        "method": "lightgbm_global_lag",
        "future_days": future_days,
        "forecast_records": forecast_df.to_dict(orient="records"),
    }


def shape_kpi_payload(df: pd.DataFrame, forecast_result: dict) -> dict:
    """
    KPI summary row for the dashboard from the DataFrame +
    forecast result. Returns total sales, forecast direction,
    and used model name.

    Args:
        df: Clean retail DataFrame
        forecast_result: Output from run_forecast_pipeline()

    Returns:
        dict with keys: total_sales, forecast_direction, winner_model, mae
    """
    total_sales = round(float(df["sales"].sum()), 2)

    forecast_records = forecast_result.get("forecast_records", [])
    if forecast_records:
        first_val = forecast_records[0].get("prediction", 0)
        last_val = forecast_records[-1].get("prediction", 0)
        if last_val > first_val * 1.02:
            direction = "increasing"
        elif last_val < first_val * 0.98:
            direction = "declining"
        else:
            direction = "flat"
    else:
        direction = "flat"

    return {
        "total_sales": total_sales,
        "forecast_direction": direction,
        "winner_model": forecast_result.get("winner", "unknown"),
        "mae": forecast_result.get("metrics", {}).get("mae"),
    }