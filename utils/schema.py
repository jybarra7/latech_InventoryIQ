"""
Shared schema for retail_clean.csv.

Agreed schema:
date, store_id, product_id, product_name, category, sales, quantity,
Month, Year, sales_lag_1, sales_lag_3, rolling_avg_4w, quantity_velocity
"""

import re
import pandas as pd

SCHEMA = {
    "date": "datetime",
    "store_id": "int",
    "product_id": "int",
    "product_name": "string",
    "category": "string",
    "sales": "float",
    "quantity": "float",
    "Month": "int",
    "Year": "int",
    "sales_lag_1": "float",
    "sales_lag_3": "float",
    "rolling_avg_4w": "float",
    "quantity_velocity": "float",
    "profit": None,
    "region": None,
    "transaction_count": None,
}

OPTIONAL_COLUMNS = ["profit", "region", "transaction_count"]

COLUMN_ALIASES = {
    "date": ["date", "order date", "transaction date", "sale date", "order_date", "trans_date", "day", "invoice date", "order dt"],
    "sales": ["sales", "revenue", "rev", "amount", "amt", "total", "total sales", "sale amount", "sales amount", "gross sales", "net sales", "price"],
    "store_id": ["store_id", "store", "store id", "store number", "store num", "store no", "branch", "branch_id", "location", "location_id", "shop", "shop_id"],
    "product_id": ["product_id", "product id", "item_id", "sku", "product sku", "product_code", "upc"],
    "product_name": ["product_name", "product", "product name", "item", "item name", "item_name", "description", "product description", "item description", "name"],
    "category": ["category", "department", "dept", "product category", "product_category", "prod category", "type", "segment"],
    "quantity": ["quantity", "qty", "units", "units sold", "units_sold", "quantity sold", "count", "unit count"],
    "profit": ["profit", "margin", "net profit", "profit amount", "net income", "gain"],
    "region": ["region", "state", "area", "territory", "zone", "geography", "market"],
    "transaction_count": ["transaction_count", "transactions", "num transactions", "transaction total", "order count", "orders"],
}


def normalize_key(name: str) -> str:
    name = str(name).strip().lower()
    name = re.sub(r"[\s\-/]+", "_", name)
    name = re.sub(r"[^a-z0-9_]", "", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name


def normalize_retail_columns(df: pd.DataFrame) -> pd.DataFrame:
    prepared = df.copy()

    prepared.columns = [normalize_key(col) for col in prepared.columns]

    alias_lookup = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        alias_lookup[normalize_key(canonical)] = canonical
        for alias in aliases:
            alias_lookup[normalize_key(alias)] = canonical

    rename_map = {}
    for col in prepared.columns:
        canonical = alias_lookup.get(col)
        if canonical and col != canonical and canonical not in prepared.columns:
            rename_map[col] = canonical

    if rename_map:
        prepared = prepared.rename(columns=rename_map)

    if "store" not in prepared.columns and "store_id" in prepared.columns:
        prepared["store"] = prepared["store_id"]

    if "item" not in prepared.columns:
        if "product_name" in prepared.columns:
            prepared["item"] = prepared["product_name"]
        elif "product_id" in prepared.columns:
            prepared["item"] = prepared["product_id"]

    if "product_id" not in prepared.columns and "product_name" in prepared.columns:
        prepared["product_id"] = prepared["product_name"]

    if "product_name" not in prepared.columns and "item" in prepared.columns:
        prepared["product_name"] = prepared["item"]

    return prepared
