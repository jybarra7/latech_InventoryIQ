import pandas as pd

def detect_anomalies(df: pd.DataFrame, threshold: float = 2.0) -> pd.DataFrame:
    """
    Flags products whose current sales exceed threshold standard deviations
    from their own trailing 90-day mean.

    Args:
        df: Clean retail DataFrame from retail_clean.csv
        threshold: Number of standard deviations to flag (default 2.0, configurable)

    Returns:
        DataFrame with columns: product_id, product_name, alert_type, severity, metric
    """
    pass


def detect_demand_decline(df: pd.DataFrame, decline_pct: float = 0.20) -> pd.DataFrame:
    """
    Flags products whose 4-week rolling average has fallen more than
    decline_pct below their 12-week rolling average.

    Args:
        df: Clean retail DataFrame from retail_clean.csv
        decline_pct: Decline threshold as a decimal (default 0.20 = 20%, configurable)

    Returns:
        DataFrame with columns: product_id, product_name, alert_type, severity, metric
    """
    pass


def detect_margin_alerts(df: pd.DataFrame, margin_threshold: float = 0.0) -> pd.DataFrame:
    """
    Flags products with profit_margin_pct below margin_threshold for 2+
    consecutive periods. Only runs when profit field is present in the dataset.

    Args:
        df: Clean retail DataFrame from retail_clean.csv
        margin_threshold: Margin floor as a decimal (default 0.0 = 0%, configurable)

    Returns:
        DataFrame with columns: product_id, product_name, alert_type, severity, metric
        Returns empty DataFrame if profit field is not present.
    """
    pass


def run_all_alerts(df: pd.DataFrame, thresholds: dict = {}) -> pd.DataFrame:
    """
    Runs all alert detectors and combines results into a single sorted DataFrame.
    Severity is sorted descending so the most urgent alerts appear first.

    Args:
        df: Clean retail DataFrame from retail_clean.csv
        thresholds: Optional dict to override default thresholds
                    Keys: 'anomaly_std', 'decline_pct', 'margin_floor'

    Returns:
        Combined DataFrame sorted by severity descending, exported as alerts.csv
    """
    pass