import pandas as pd


def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema + derived features.
    """

    df = df.copy()

    # -------------------------
    # HANDLE MULTIPLE DATASETS
    # -------------------------
    df = df.rename(columns={
        "store": "store_id",
        "item": "product_id",
        "sales": "sales",

        # Walmart mappings
        "Order Date": "date",
        "Sales": "sales",
        "Quantity": "quantity",
    })

    # -------------------------
    # OPTIONAL FIELD DETECTION
    # -------------------------
    optional_fields = {
        "profit": "inactive",
        "region": "inactive",
        "transaction_count": "inactive"
    }

    for field in optional_fields:
        if field in df.columns:
            optional_fields[field] = "active"

    df.attrs["optional_fields"] = optional_fields

    # -------------------------
    # FALLBACKS (Walmart compatibility)
    # -------------------------
    if "product_id" not in df.columns:
        df["product_id"] = df.index

    if "store_id" not in df.columns:
        df["store_id"] = 0

    if "quantity" not in df.columns:
        df["quantity"] = df["sales"]

    # -------------------------
    # TYPE FIXES
    # -------------------------
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "store_id", "date"])

    # -------------------------
    # BASE FIELDS
    # -------------------------
    df["product_name"] = "Item " + df["product_id"].astype(str)
    df["category"] = "Uncategorized"

    # -------------------------
    # TIME FEATURES
    # -------------------------
    df["Month"] = df["date"].dt.month
    df["Year"] = df["date"].dt.year

    # -------------------------
    # LAG FEATURES
    # -------------------------
    df["sales_lag_1"] = df.groupby(["product_id", "store_id"])["sales"].shift(1)
    df["sales_lag_3"] = df.groupby(["product_id", "store_id"])["sales"].shift(3)

    # -------------------------
    # ROLLING FEATURES
    # -------------------------
    df["rolling_avg_4w"] = (
        df.groupby(["product_id", "store_id"])["sales"]
        .rolling(window=4, min_periods=1)
        .mean()
        .reset_index(level=[0, 1], drop=True)
    )

    # -------------------------
    # VELOCITY
    # -------------------------
    df["quantity_velocity"] = df["sales"] - df["sales_lag_1"]

    return df