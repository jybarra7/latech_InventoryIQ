from utils.trend import compute_trend
import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# -------------------------------
# 1. BUILD AI PAYLOAD (YOUR PART)
# -------------------------------
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
        prompt = f"""
You are a retail analytics assistant.

Sales trend: {payload['trend']}

Write a short, clear business summary (2-3 sentences):
- describe the current sales trend
- suggest a simple next step

Use plain, direct language suitable for a store manager.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text

    except Exception as e:
        return {"error": str(e)}