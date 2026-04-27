"""Shared schema for retail_clean.csv.

Krisna approved this schema for the first processor handoff.

Raw train.csv columns:
date, store, item, sales

Clean retail_clean.csv columns:
date, store_id, product_id, product_name, category, sales, quantity
"""


REQUIRED_COLUMNS = {
    "date": "datetime - sales date from train.csv",
    "store_id": "integer - renamed from store",
    "product_id": "integer - renamed from item",
    "product_name": "string - generated from product_id, for display",
    "category": "string - defaults to Uncategorized because train.csv has no category",
    "sales": "number - sales/demand value from train.csv",
    "quantity": "number - mirrors sales because train.csv sales is units/demand",
}


OPTIONAL_COLUMNS = {
    "profit": "number - optional, missing from train.csv",
    "region": "string - optional, missing from train.csv",
    "transaction_count": "number - optional, missing from train.csv",
}
