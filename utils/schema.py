# utils/schema.py

SCHEMA = {
    "date": {
        "type": "datetime",
        "source": "date",
        "required": True
    },
    "store_id": {
        "type": "int",
        "source": "store",
        "required": True
    },
    "product_id": {
        "type": "int",
        "source": "item",
        "required": True
    },
    "product_name": {
        "type": "string",
        "source": "generated",
        "rule": "Item {item}",
        "required": True
    },
    "category": {
        "type": "string",
        "source": "generated",
        "default": "Uncategorized",
        "required": True
    },
    "sales": {
        "type": "float",
        "source": "sales",
        "required": True
    },
    "quantity": {
        "type": "float",
        "source": "sales",
        "rule": "same as sales",
        "required": True
    },

    # Optional fields (inactive in this dataset)
    "profit": {
        "type": "float",
        "required": False,
        "active": False
    },
    "region": {
        "type": "string",
        "required": False,
        "active": False
    },
    "transaction_count": {
        "type": "int",
        "required": False,
        "active": False
    }
}