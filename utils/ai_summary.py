from utils.trend import compute_trend


def build_ai_payload(df):
    """
    Build structured payload for AI consumption.
    """

    if df.empty:
        return {"error": "No data available"}

    trend = compute_trend(df)

    payload = {
        "trend": trend,
        "latest_sales": float(df["sales"].iloc[-1]),
        "avg_sales": float(df["sales"].mean()),
        "max_sales": float(df["sales"].max()),
        "min_sales": float(df["sales"].min()),
        "data_points": len(df)
    }

    return payload