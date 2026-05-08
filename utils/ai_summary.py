from utils.trend import compute_trend
import os
from dotenv import load_dotenv

try:
    from google import genai
except ImportError:
    genai = None

# Load environment variables
load_dotenv()

def get_gemini_client():
    """Create the Gemini client only when a key is available."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, "GEMINI_API_KEY is not set."
    if genai is None:
        return None, "google-genai is not installed."
    return genai.Client(api_key=api_key), None


# -------------------------------
# 1. BUILD AI PAYLOAD (YOUR PART)
# -------------------------------
def build_payload(trend, model_name, accuracy, alerts_df):
    """
    Andrew Garcia Leopold: build the exact payload shape app.py expects.
    This keeps the dashboard connected to Sarah's Gemini summary function.
    """
    top_alerts = []

    # Andrew Garcia Leopold: only send the top few alerts so the AI prompt stays short.
    if alerts_df is not None and not alerts_df.empty:
        sorted_alerts = alerts_df.sort_values(by="severity", ascending=False).head(3)

        for _, row in sorted_alerts.iterrows():
            top_alerts.append({
                "product": row.get("product", row.get("product_name", "Unknown")),
                "type": row.get("alert_type", "Unknown"),
                "severity": row.get("severity", 0),
            })

    return {
        "model": model_name,
        "accuracy": accuracy,
        "trend": trend,
        "top_alerts": top_alerts,
    }


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


# -------------------------------
# 2. GENERATE SUMMARY (TEAM PART)
# -------------------------------
def generate_summary(payload):
    """
    Sends structured payload to Gemini and returns summary text
    """
    try:
        client, client_error = get_gemini_client()
        if client_error:
            return {
                "status": "error",
                "message": client_error
            }

        # Andrew Garcia Leopold: support both the newer dashboard payload and
        # Sarah's older local-test payload so either path works without crashing.
        trend = payload.get("trend", "Unknown")
        accuracy = payload.get("accuracy", "not available")
        top_alerts = payload.get("top_alerts", [])

        prompt = f"""
You are a retail analytics assistant.

Model accuracy: {accuracy}
Sales trend: {trend}
Top alerts: {top_alerts}

Write a short, clear business summary (2-3 sentences):
- describe the current sales trend
- mention whether alerts are present or not
- suggest a simple next step

Use plain, direct language suitable for a store manager.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {
            "status": "success",
            "text": response.text
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
