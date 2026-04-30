import streamlit as st
import pandas as pd

from dotenv import load_dotenv
import os

from utils.processor import load_and_clean_data
from utils.trend import compute_trend
from utils.ai_summary import build_payload, generate_summary

# ------------------------
# ENV SETUP (NOT IMPORTS)
# ------------------------
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# ------------------------
# APP START
# ------------------------
st.title("LA Tech Teams Dashboard")

uploaded_file = st.file_uploader("Upload train.csv", type=["csv"])
st.write("Waiting for file upload...")

if uploaded_file:
    st.write("File uploaded successfully!")

    df = pd.read_csv(uploaded_file)
    df = load_and_clean_data(df)

    st.subheader("Processed Data")
    st.dataframe(df)

    # ------------------------
    # Filters
    # ------------------------
    st.sidebar.header("Filters")

    store = st.sidebar.selectbox("Store", sorted(df["store_id"].unique()))
    product = st.sidebar.selectbox("Product", sorted(df["product_id"].unique()))

    # ------------------------
    # Filtered Data
    # ------------------------
    filtered = df[
        (df["store_id"] == store) &
        (df["product_id"] == product)
    ]

    # ------------------------
    # Trend
    # ------------------------
    trend = compute_trend(filtered)
    st.subheader("Trend")
    st.write(trend)

    # ------------------------
    # Chart
    # ------------------------
    st.subheader("Sales Over Time")
    st.line_chart(filtered.set_index("date")["sales"])

    # ------------------------
    # AI SUMMARY (NEW)
    # ------------------------
    st.subheader("AI Summary")

    # session state (prevents repeated API calls)
    if "summary" not in st.session_state:
        st.session_state.summary = None

    if st.button("Generate Summary"):
        with st.spinner("Generating insights..."):

            # replace later with real outputs
            model_name = "Linear Regression"
            accuracy = 0.87

            # Dummy alerts
            alerts_df = pd.DataFrame([
                {"product": "Milk", "alert_type": "demand drop", "severity": 0.9},
                {"product": "Bread", "alert_type": "low margin", "severity": 0.8},
                {"product": "Eggs", "alert_type": "volatility spike", "severity": 0.7}
            ])

            payload = build_payload(trend, model_name, accuracy, alerts_df)
            result = generate_summary(payload)

            if result["status"] == "success":
                st.session_state.summary = result["text"]
            else:
                st.error("Unable to generate summary. Please try again.")

    
    if st.session_state.summary:
        st.write(st.session_state.summary)