# utils/processor.py

import pandas as pd
from datetime import datetime

def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema.
    """

    df = df.copy()

    # --- Rename columns ---
    df = df.rename(columns={
        "store": "store_id",
        "item": "product_id",
        "sales": "sales"
    })

    # --- Parse date ---
    df["date"] = pd.to_datetime(df["date"])

    # --- Generated fields ---
    df["product_name"] = "Item " + df["product_id"].astype(str)
    df["category"] = "Uncategorized"
    df["quantity"] = df["sales"]

    return df
# utils/processor.py

import pandas as pd

def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema + derived features.
    """

    df = df.copy()

    # -------------------------
    # 1. RENAME RAW COLUMNS
    # -------------------------
    df = df.rename(columns={
        "store": "store_id",
        "item": "product_id",
        "sales": "sales"
    })

    # -------------------------
    # 2. TYPE FIXES
    # -------------------------
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "store_id", "date"])

    # -------------------------
    # 3. BASE GENERATED FIELDS
    # -------------------------
    df["product_name"] = "Item " + df["product_id"].astype(str)
    df["category"] = "Uncategorized"
    df["quantity"] = df["sales"]

    # -------------------------
    # 4. TIME FEATURES
    # -------------------------
    df["Month"] = df["date"].dt.month
    df["Year"] = df["date"].dt.year

    # -------------------------
    # 5. LAG FEATURES
    # (previous values per product-store group)
    # -------------------------
    df["sales_lag_1"] = df.groupby(["product_id", "store_id"])["sales"].shift(1)
    df["sales_lag_3"] = df.groupby(["product_id", "store_id"])["sales"].shift(3)

    # -------------------------
    # 6. ROLLING FEATURES
    # -------------------------
    df["rolling_avg_4w"] = (
        df.groupby(["product_id", "store_id"])["sales"]
        .rolling(window=4, min_periods=1)
        .mean()
        .reset_index(level=[0,1], drop=True)
    )

    # -------------------------
    # 7. VELOCITY FEATURE
    # (change in demand)
    # -------------------------
    df["quantity_velocity"] = df["sales"] - df["sales_lag_1"]

    return df