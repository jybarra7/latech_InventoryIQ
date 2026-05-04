import pandas as pd

from utils.schema import OPTIONAL_COLUMNS, SCHEMA


# -------------------------
# FEATURE FLAGS
# -------------------------
def get_feature_flags(raw_data: pd.DataFrame) -> dict:
    feature_flags = {}

    feature_flags["profit"] = (
        "Profit data found: margin alerts can be active."
        if "profit" in raw_data.columns
        else "Profit data missing: margin alerts should be inactive."
    )

    feature_flags["region"] = (
        "Region data found: region filters can be active."
        if "region" in raw_data.columns
        else "Region data missing: region filters should be inactive."
    )

    feature_flags["transaction_count"] = (
        "Transaction count found: transaction metrics can be active."
        if "transaction_count" in raw_data.columns
        else "Transaction count missing: transaction metrics should be inactive."
    )

    return feature_flags


# -------------------------
# SCHEMA MAPPING SYSTEM
# -------------------------
SOURCE_MAPPINGS = {
    "retail_clean": {
        "required_columns": {"date", "store_id", "product_id", "sales"},
        "rename_columns": {},
        "defaults": {"category": "Uncategorized"},
        "id_fields": {},
    },
    "store_item_demand": {
        "required_columns": {"date", "store", "item", "sales"},
        "rename_columns": {"store": "store_id", "item": "product_id"},
        "defaults": {"category": "Uncategorized"},
        "id_fields": {},
    },
    "retail_orders": {
        "required_columns": {
            "Order Date",
            "State",
            "Category",
            "Product Name",
            "Sales",
            "Quantity",
            "Profit",
        },
        "rename_columns": {
            "Order Date": "date",
            "Product Name": "product_name",
            "Category": "category",
            "Sales": "sales",
            "Quantity": "quantity",
            "Profit": "profit",
            "State": "region",
        },
        "defaults": {},
        "id_fields": {
            "store_id": "region",
            "product_id": "product_name",
        },
    },
}


def detect_source_format(df: pd.DataFrame) -> str:
    columns = set(df.columns)

    for name, mapping in SOURCE_MAPPINGS.items():
        if mapping["required_columns"].issubset(columns):
            return name

    raise ValueError("Unsupported dataset format.")


def map_to_standard_schema(df: pd.DataFrame, source_format: str) -> pd.DataFrame:
    mapping = SOURCE_MAPPINGS[source_format]

    df = df.rename(columns=mapping["rename_columns"]).copy()

    for col, default in mapping["defaults"].items():
        if col not in df.columns:
            df[col] = default

    for id_col, src_col in mapping["id_fields"].items():
        df[id_col] = pd.factorize(df[src_col])[0] + 1

    if "product_name" not in df.columns:
        df["product_name"] = "Item " + df["product_id"].astype(str)

    if "quantity" not in df.columns:
        df["quantity"] = df["sales"]

    return df


# -------------------------
# MAIN CLEANING PIPELINE
# -------------------------
def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Detect + standardize schema
    source_format = detect_source_format(df)
    df = map_to_standard_schema(df, source_format)

    # Optional feature tracking
    optional_fields = {
        "profit": "active" if "profit" in df.columns else "inactive",
        "region": "active" if "region" in df.columns else "inactive",
        "transaction_count": "active" if "transaction_count" in df.columns else "inactive",
    }
    df.attrs["optional_fields"] = optional_fields

    # Fallbacks
    if "product_id" not in df.columns:
        df["product_id"] = df.index

    if "store_id" not in df.columns:
        df["store_id"] = 0

    if "quantity" not in df.columns:
        df["quantity"] = df["sales"]

    # Type fixes
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "store_id", "date"])

    # Base fields
    if "product_name" not in df.columns:
        df["product_name"] = "Item " + df["product_id"].astype(str)

    if "category" not in df.columns:
        df["category"] = "Uncategorized"

    # Time features
    df["Month"] = df["date"].dt.month
    df["Year"] = df["date"].dt.year

    # Lag features
    df["sales_lag_1"] = df.groupby(["product_id", "store_id"])["sales"].shift(1)
    df["sales_lag_3"] = df.groupby(["product_id", "store_id"])["sales"].shift(3)

    # Rolling feature
    df["rolling_avg_4w"] = (
        df.groupby(["product_id", "store_id"])["sales"]
        .rolling(window=4, min_periods=1)
        .mean()
        .reset_index(level=[0, 1], drop=True)
    )

    # Velocity
    df["quantity_velocity"] = df["sales"] - df["sales_lag_1"]

    # Final schema output
    clean_columns = [
        col for col, typ in SCHEMA.items() if typ is not None
    ]
    clean_columns += [
        col for col in OPTIONAL_COLUMNS if col in df.columns
    ]

    return df[clean_columns]