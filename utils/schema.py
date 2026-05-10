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


# Andrew Garcia Leopold: aliases let the processor recognize common column names
# from different retail datasets without writing one SOURCE_MAPPINGS block per file.
COLUMN_ALIASES = {
    "date": ["date", "order date", "transaction date", "sale date", "order_date", "trans_date", "day"],
    "sales": ["sales", "revenue", "amount", "total", "total sales", "sale amount", "gross sales", "price"],
    "store_id": ["store_id", "store", "branch", "branch_id", "location", "location_id", "shop", "shop_id"],
    "product_id": ["product_id", "item", "item_id", "sku", "product_code", "upc"],
    "product_name": ["product_name", "product", "item name", "item_name", "description", "product description", "name"],
    "category": ["category", "department", "dept", "product category", "product_category", "type", "segment"],
    "quantity": ["quantity", "qty", "units", "units sold", "quantity sold", "count"],
    "profit": ["profit", "margin", "net profit", "profit amount", "net income", "gain"],
    "region": ["region", "state", "area", "territory", "zone", "geography", "market"],
    "transaction_count": ["transaction_count", "transactions", "num transactions", "order count", "orders"],
}
