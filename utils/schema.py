"""
Shared schema for retail_clean.csv.

Agreed schema:
date, store_id, product_id, product_name, category, sales, quantity
"""

SCHEMA = {
    "date": "datetime",
    "store_id": "int",
    "product_id": "int",
    "product_name": "string",
    "category": "string",
    "sales": "float",
    "quantity": "float",

    "profit": None,
    "region": None,
    "transaction_count": None,
}

OPTIONAL_COLUMNS = ["profit", "region", "transaction_count"]
