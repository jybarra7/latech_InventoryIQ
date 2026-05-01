import pandas as pd

from utils.schema import OPTIONAL_COLUMNS, SCHEMA

def map_to_clean_schema(raw_data: pd.DataFrame) -> pd.DataFrame:
    """Convert raw CSV columns into the approved retail_clean.csv schema.
    Called by app.py when an uploaded file uses non-standard column names."""
    return load_and_clean_data(raw_data)


def get_feature_flags(raw_data: pd.DataFrame) -> dict:
    """Return plain-English messages for features that depend on optional fields.
    Called by app.py to enable/disable features based on available columns."""
    feature_flags = {}

    if "profit" in raw_data.columns:
        feature_flags["profit"] = "Profit data found: margin alerts can be active."
    else:
        feature_flags["profit"] = "Profit data missing: margin alerts should be inactive."

    if "region" in raw_data.columns:
        feature_flags["region"] = "Region data found: region filters can be active."
    else:
        feature_flags["region"] = "Region data missing: region filters should be inactive."

    if "transaction_count" in raw_data.columns:
        feature_flags["transaction_count"] = "Transaction count found: transaction metrics can be active."
    else:
        feature_flags["transaction_count"] = "Transaction count missing: transaction metrics should be inactive."

    return feature_flags


def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema + derived features.
    """

SOURCE_MAPPINGS = {
    # Clean format: already uses the shared project column names.
    "retail_clean": {
        "required_columns": {"date", "store_id", "product_id", "sales"},
        "rename_columns": {},
        "defaults": {"category": "Uncategorized"},
        "id_fields": {},
    },
    # Kaggle format: has store and item IDs already.
    "store_item_demand": {
        "required_columns": {"date", "store", "item", "sales"},
        "rename_columns": {"store": "store_id", "item": "product_id"},
        "defaults": {"category": "Uncategorized"},
        "id_fields": {},
    },
    # Retail order format: has business columns, but no store_id/product_id.
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
    """
    Pick the first known retail source format that matches the input columns.
    """
    columns = set(df.columns)

    # Check which mapping fits the columns in the uploaded file.
    for source_name, source_mapping in SOURCE_MAPPINGS.items():
        if source_mapping["required_columns"].issubset(columns):
            return source_name

    raise ValueError(
        "Unsupported dataset format. Add a source mapping for this retail file."
    )


def map_to_standard_schema(df: pd.DataFrame, source_format: str) -> pd.DataFrame:
    """
    Translate source-specific column names into the shared project schema.
    """
    source_mapping = SOURCE_MAPPINGS[source_format]

    # Rename columns so every dataset uses the same names after this step.
    df = df.rename(columns=source_mapping["rename_columns"]).copy()

    # Add default values for fields that are missing from this source.
    for column_name, default_value in source_mapping["defaults"].items():
        if column_name not in df.columns:
            df[column_name] = default_value

    # If IDs are missing, create simple numeric IDs from text columns.
    for id_column, source_column in source_mapping["id_fields"].items():
        df[id_column] = pd.factorize(df[source_column])[0] + 1

    # If the file only has product IDs, create a readable product name.
    if "product_name" not in df.columns:
        df["product_name"] = "Item " + df["product_id"].astype(str)

    # If quantity is missing, use sales as the demand/quantity value.
    if "quantity" not in df.columns:
        df["quantity"] = df["sales"]

    return df


def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps raw dataset into retail_clean schema + derived features.
    """

    df = df.copy()
    source_format = detect_source_format(df)
    df = map_to_standard_schema(df, source_format)

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "store_id", "date"])

    df["Month"] = df["date"].dt.month
    df["Year"] = df["date"].dt.year

    # Create past-sales fields inside each product/store group.
    df["sales_lag_1"] = df.groupby(["product_id", "store_id"])["sales"].shift(1)
    df["sales_lag_3"] = df.groupby(["product_id", "store_id"])["sales"].shift(3)

    df["rolling_avg_4w"] = (
        df.groupby(["product_id", "store_id"])["sales"]
        .rolling(window=4, min_periods=1)
        .mean()
        .reset_index(level=[0, 1], drop=True)
    )

    df["quantity_velocity"] = df["sales"] - df["sales_lag_1"]

    # Keep the final output consistent, plus optional fields if they exist.
    clean_columns = [
        column for column, column_type in SCHEMA.items() if column_type is not None
    ]
    clean_columns += [column for column in OPTIONAL_COLUMNS if column in df.columns]

    return df[clean_columns]
