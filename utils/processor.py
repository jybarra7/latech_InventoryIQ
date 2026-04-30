import pandas as pd


def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema + derived features.
    """

    df = df.copy()

    df = df.rename(columns={
        "store": "store_id",
        "item": "product_id",
        "sales": "sales"
    })

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "store_id", "date"])

    df["product_name"] = "Item " + df["product_id"].astype(str)
    df["category"] = "Uncategorized"
    df["quantity"] = df["sales"]

    df["Month"] = df["date"].dt.month
    df["Year"] = df["date"].dt.year

    df["sales_lag_1"] = df.groupby(["product_id", "store_id"])["sales"].shift(1)
    df["sales_lag_3"] = df.groupby(["product_id", "store_id"])["sales"].shift(3)

    df["rolling_avg_4w"] = (
        df.groupby(["product_id", "store_id"])["sales"]
        .rolling(window=4, min_periods=1)
        .mean()
        .reset_index(level=[0, 1], drop=True)
    )

    df["quantity_velocity"] = df["sales"] - df["sales_lag_1"]

    return df