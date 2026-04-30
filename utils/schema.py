"""
Shared schema for retail_clean.csv.

Agreed schema:
date, store_id, product_id, product_name, category, sales, quantity,
Month, Year, sales_lag_1, sales_lag_3, rolling_avg_4w, quantity_velocity
"""

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
