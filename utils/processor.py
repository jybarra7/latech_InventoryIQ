import pandas as pd
from difflib import get_close_matches
import re

from utils.schema import COLUMN_ALIASES, OPTIONAL_COLUMNS, SCHEMA


# -------------------------
# APP COMPATIBILITY WRAPPER
# -------------------------
def map_to_clean_schema(raw_data: pd.DataFrame) -> pd.DataFrame:
    """Andrew Garcia Leopold: normalize an uploaded dataset into the shared clean schema."""
    # app.py calls this helper when a user uploads a file with non-standard column names.
    # The full cleaning work still happens in load_and_clean_data() below.
    return load_and_clean_data(raw_data)


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
# FUZZY SCHEMA MAPPING
# -------------------------
def normalize_column_name(column_name: str) -> str:
    """Andrew Garcia Leopold: make column names easier to compare."""
    # Example: "Order_Date" and "order date" both become "order date".
    column_name = str(column_name).strip().lower()
    column_name = re.sub(r"[_\-]+", " ", column_name)
    column_name = re.sub(r"[^a-z0-9 ]+", "", column_name)
    return re.sub(r"\s+", " ", column_name).strip()


def build_alias_lookup() -> dict:
    """Andrew Garcia Leopold: convert COLUMN_ALIASES into a fast lookup table."""
    alias_lookup = {}

    for clean_column, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            normalized_alias = normalize_column_name(alias)

            # Some aliases, like "product", can mean ID or name depending on the file.
            # Keeping the first match avoids random overwrites and keeps behavior stable.
            if normalized_alias not in alias_lookup:
                alias_lookup[normalized_alias] = clean_column

    return alias_lookup


def infer_column_mapping(df: pd.DataFrame) -> dict:
    """Andrew Garcia Leopold: map uploaded columns to the shared clean schema."""
    alias_lookup = build_alias_lookup()
    normalized_aliases = list(alias_lookup.keys())
    mapping = {}
    used_raw_columns = set()

    for raw_column in df.columns:
        normalized_column = normalize_column_name(raw_column)

        # First try a direct alias match, like "Order Date" -> "date".
        clean_column = alias_lookup.get(normalized_column)

        # Then try a fuzzy match for close names, like "sale amount" vs "sales amount".
        if clean_column is None:
            close_matches = get_close_matches(normalized_column, normalized_aliases, n=1, cutoff=0.88)
            if close_matches:
                clean_column = alias_lookup[close_matches[0]]

        # Keep the first raw column that maps to a clean column.
        if clean_column and clean_column not in mapping:
            mapping[clean_column] = raw_column
            used_raw_columns.add(raw_column)

    return mapping


def map_to_standard_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Andrew Garcia Leopold: rename detected columns into the shared project schema."""
    df = df.copy()
    column_mapping = infer_column_mapping(df)

    missing_required = [col for col in ["date", "sales"] if col not in column_mapping]
    if missing_required:
        raise ValueError(
            "Unsupported dataset format. Missing required fields: "
            + ", ".join(missing_required)
        )

    rename_columns = {raw: clean for clean, raw in column_mapping.items()}
    df = df.rename(columns=rename_columns)
    df.attrs["column_mapping"] = column_mapping

    # Andrew Garcia Leopold: if a file has names but not IDs, create simple IDs.
    if "store_id" not in df.columns and "region" in df.columns:
        df["store_id"] = pd.factorize(df["region"])[0] + 1

    if "product_id" not in df.columns and "product_name" in df.columns:
        df["product_id"] = pd.factorize(df["product_name"])[0] + 1

    return df


# -------------------------
# MAIN CLEANING PIPELINE
# -------------------------
def load_and_clean_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Detect + standardize schema with the fuzzy alias mapper.
    df = map_to_standard_schema(df)

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
