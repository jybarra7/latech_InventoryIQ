import streamlit as st
import pandas as pd

from dotenv import load_dotenv
import os

from utils.processor import load_and_clean_data
from utils.trend import compute_trend

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