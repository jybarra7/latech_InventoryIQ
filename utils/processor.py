"""Load and inspect the raw retail training dataset.

The processor is the data-prep step of the pipeline. Its full job will be to:
1. Read the raw CSV.
2. Map raw column names to the agreed clean schema.
3. Add required fields that train.csv does not include directly.
4. Export data/retail_clean.csv for the rest of the team.

This first version only proves that we can ingest data/train.csv successfully.
"""

from pathlib import Path

import pandas as pd

from utils.schema import OPTIONAL_COLUMNS


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_CSV_PATH = PROJECT_ROOT / "data" / "train.csv"
CLEAN_CSV_PATH = PROJECT_ROOT / "data" / "retail_clean.csv"


def load_raw_data(csv_path: Path = RAW_CSV_PATH) -> pd.DataFrame:
    """Read train.csv into a pandas DataFrame."""
    return pd.read_csv(csv_path)


def preview_raw_data(data: pd.DataFrame) -> None:
    """Print basic information so we understand the raw dataset shape."""
    print("Raw dataset loaded successfully.")
    print(f"Rows: {len(data):,}")
    print(f"Columns: {list(data.columns)}")
    print("\nFirst 5 rows:")
    print(data.head())


def map_to_clean_schema(raw_data: pd.DataFrame) -> pd.DataFrame:
    """Convert train.csv columns into the approved retail_clean.csv schema."""
    clean_data = raw_data.rename(
        columns={
            "store": "store_id",
            "item": "product_id",
        }
    ).copy()

    clean_data["date"] = pd.to_datetime(clean_data["date"])
    clean_data["product_name"] = "Item " + clean_data["product_id"].astype(str)
    clean_data["category"] = "Uncategorized"
    clean_data["quantity"] = clean_data["sales"]

    clean_columns = [
        "date",
        "store_id",
        "product_id",
        "product_name",
        "category",
        "sales",
        "quantity",
    ]

    return clean_data[clean_columns]


def preview_clean_data(data: pd.DataFrame) -> None:
    """Print the mapped dataset so we can verify the clean schema."""
    print("\nClean schema preview:")
    print(f"Columns: {list(data.columns)}")
    print("\nFirst 5 clean rows:")
    print(data.head())


def log_optional_field_status(raw_data: pd.DataFrame) -> None:
    """Log whether optional project fields are available in the raw dataset."""
    print("\nOptional field status:")
    for field_name in OPTIONAL_COLUMNS:
        if field_name in raw_data.columns:
            print(f"- {field_name}: present")
        else:
            print(f"- {field_name}: missing")


def get_feature_flags(raw_data: pd.DataFrame) -> dict[str, str]:
    """Return plain-English messages for features that depend on optional fields."""
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
        feature_flags["transaction_count"] = (
            "Transaction count found: transaction metrics can be active."
        )
    else:
        feature_flags["transaction_count"] = (
            "Transaction count missing: transaction metrics should be inactive."
        )

    return feature_flags


def preview_feature_flags(feature_flags: dict[str, str]) -> None:
    """Print graceful degradation messages for downstream teammates."""
    print("\nFeature availability:")
    for message in feature_flags.values():
        print(f"- {message}")


def export_clean_data(
    clean_data: pd.DataFrame,
    output_path: Path = CLEAN_CSV_PATH,
) -> None:
    """Write the cleaned dataset to retail_clean.csv for the rest of the pipeline."""
    clean_data.to_csv(output_path, index=False)
    print(f"\nExported {len(clean_data):,} rows to {output_path}")


def main() -> None:
    """Run the processor checkpoint: load train.csv and map clean columns."""
    raw_data = load_raw_data()
    preview_raw_data(raw_data)
    log_optional_field_status(raw_data)
    feature_flags = get_feature_flags(raw_data)
    preview_feature_flags(feature_flags)

    clean_data = map_to_clean_schema(raw_data)
    preview_clean_data(clean_data)
    export_clean_data(clean_data)


if __name__ == "__main__":
    main()
