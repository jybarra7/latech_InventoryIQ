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


# Andrew Garcia Leopold: upload validation keeps bad CSV/XLSX files out of the cleaning pipeline.
def validate_uploaded_data(raw_data: pd.DataFrame) -> dict:
    """Andrew Garcia Leopold: check that an uploaded CSV/XLSX has usable retail data."""
    if not isinstance(raw_data, pd.DataFrame):
        raise ValueError("Upload error: the file could not be read as a table.")

    if raw_data.empty or len(raw_data.columns) == 0:
        raise ValueError("Upload error: the file is empty. Please upload a CSV with rows and columns.")

    normalized_columns = [normalize_column_name(column) for column in raw_data.columns]

    if any(column == "" for column in normalized_columns):
        raise ValueError("Upload error: one or more columns have no name. Please rename blank columns.")

    duplicate_columns = sorted({
        column for column in normalized_columns
        if normalized_columns.count(column) > 1
    })
    if duplicate_columns:
        raise ValueError(
            "Upload error: duplicate column names found: "
            + ", ".join(duplicate_columns)
        )

    column_mapping = infer_column_mapping(raw_data)
    missing_required = [column for column in ["date", "sales"] if column not in column_mapping]
    if missing_required:
        raise ValueError(
            "Upload error: the file must include a date column and a sales column. "
            "Missing: " + ", ".join(missing_required)
        )

    date_column = column_mapping["date"]
    parsed_dates = pd.to_datetime(raw_data[date_column], errors="coerce")
    if parsed_dates.isna().any():
        raise ValueError(
            f"Upload error: '{date_column}' has blank or invalid dates. "
            "Please use real dates like 2024-01-31."
        )

    sales_column = column_mapping["sales"]
    parsed_sales = pd.to_numeric(raw_data[sales_column], errors="coerce")
    if parsed_sales.isna().any():
        raise ValueError(
            f"Upload error: '{sales_column}' has blank or non-numeric sales values. "
            "Please use numbers like 1250.50."
        )

    return column_mapping


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
            alias_lookup.setdefault(normalized_alias, []).append(clean_column)

    return alias_lookup


def resolve_alias_match(clean_columns: list, raw_series: pd.Series) -> str:
    """Andrew Garcia Leopold: pick the safest clean column for an ambiguous alias."""
    if len(clean_columns) == 1:
        return clean_columns[0]

    # Andrew: if a column could mean product ID or product name, use the values.
    # Numeric-looking values are IDs; text values are names.
    if {"product_id", "product_name"}.issubset(clean_columns):
        numeric_values = pd.to_numeric(raw_series.dropna(), errors="coerce")
        return "product_id" if numeric_values.notna().all() else "product_name"

    # Andrew: if we cannot confidently decide, keep the schema order from COLUMN_ALIASES.
    return clean_columns[0]


def infer_column_mapping(df: pd.DataFrame) -> dict:
    """Andrew Garcia Leopold: map uploaded columns to the shared clean schema."""
    alias_lookup = build_alias_lookup()
    normalized_aliases = list(alias_lookup.keys())
    mapping = {}

    for raw_column in df.columns:
        normalized_column = normalize_column_name(raw_column)

        # First try a direct alias match, like "Order Date" -> "date".
        clean_columns = alias_lookup.get(normalized_column)

        # Then try a fuzzy match for close names, like "sale amount" vs "sales amount".
        if clean_columns is None:
            close_matches = get_close_matches(normalized_column, normalized_aliases, n=1, cutoff=0.88)
            if close_matches:
                clean_columns = alias_lookup[close_matches[0]]

        if clean_columns is None:
            continue

        clean_column = resolve_alias_match(clean_columns, df[raw_column])

        # Andrew: one uploaded column should only fill one clean schema field.
        # This keeps the inferred mapping predictable for the dashboard.
        if clean_column and clean_column not in mapping:
            mapping[clean_column] = raw_column

    return mapping


def map_to_standard_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Andrew Garcia Leopold: rename detected columns into the shared project schema."""
    df = df.copy()
    column_mapping = infer_column_mapping(df)

    # Andrew: date and sales are the hard requirements. Missing product/store
    # dimensions are handled below as a single aggregated series.
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

    validate_uploaded_data(df)

    # Detect + standardize schema with the fuzzy alias mapper.
    df = map_to_standard_schema(df)

    # Optional feature tracking
    optional_fields = {
        "profit": "active" if "profit" in df.columns else "inactive",
        "region": "active" if "region" in df.columns else "inactive",
        "transaction_count": "active" if "transaction_count" in df.columns else "inactive",
    }
    df.attrs["optional_fields"] = optional_fields
    aggregation_notes = []

    # Fallbacks
    if "product_id" not in df.columns:
        # If no product field exists, treat the upload as one aggregated product
        # series instead of creating one group per row.
        df["product_id"] = 0
        df["product_name"] = "Aggregated Series"
        aggregation_notes.append(
            "No product field detected; using one aggregated product series."
        )

    if "store_id" not in df.columns:
        # A constant store keeps lag/rolling features meaningful for aggregate files.
        df["store_id"] = 0
        aggregation_notes.append(
            "No store field detected; using one aggregated store series."
        )

    if aggregation_notes:
        df.attrs["aggregation_notes"] = aggregation_notes

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
