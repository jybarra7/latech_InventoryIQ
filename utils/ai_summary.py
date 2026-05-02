import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# -------------------------------
# 1. BUILD PAYLOAD
# -------------------------------
def build_payload(trend, model_name, accuracy, alerts_df):
    """
    Builds structured payload for Gemini
    """

    top_alerts = []

    if alerts_df is not None and not alerts_df.empty:
        sorted_alerts = alerts_df.sort_values(by="severity", ascending=False).head(3)

        for _, row in sorted_alerts.iterrows():
            top_alerts.append({
                "product": row.get("product", "Unknown"),
                "type": row.get("alert_type", "Unknown"),
                "severity": row.get("severity", 0)
            })

    payload = {
        "model": model_name,
        "accuracy": accuracy,
        "trend": trend,
        "top_alerts": top_alerts
    }

    return payload


# -------------------------------
# 2. GENERATE SUMMARY
# -------------------------------
def generate_summary(payload):
    """
    Sends structured payload to Gemini and returns summary text
    """

    try:
        prompt = f"""
You are a retail analytics assistant.

Model accuracy: {payload['accuracy']}
Sales trend: {payload['trend']}

Top alerts:
{payload['top_alerts']}

If data is limited:
- Do NOT mention system issues or missing pipelines
- Do NOT use vague or corporate language
- Provide a simple, practical summary based on what is available

Write a short, clear business summary (2-3 sentences):
- describe the current sales trend (or lack of clear trend)
- mention whether alerts are present or not
- suggest a simple next step (e.g., monitor, review, adjust)

Use plain, direct language suitable for a store manager.
Use natural, smooth phrasing (avoid awkward phrases like "data is still developing" or "let’s").
Avoid buzzwords and overly formal phrasing.
Do not repeat raw numbers.
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


# -------------------------------
# 3. TEST FUNCTION
# -------------------------------
def test_gemini():
    import pandas as pd

    dummy_alerts = pd.DataFrame([
        {"product": "Milk", "alert_type": "demand drop", "severity": 0.9},
        {"product": "Bread", "alert_type": "low margin", "severity": 0.8},
        {"product": "Eggs", "alert_type": "volatility spike", "severity": 0.7}
    ])

    payload = build_payload(
        trend="declining",
        model_name="Linear Regression",
        accuracy=0.87,
        alerts_df=dummy_alerts
    )

    result = generate_summary(payload)

    return result


# -------------------------------
# RUN TEST
# -------------------------------
if __name__ == "__main__":
    print(test_gemini())