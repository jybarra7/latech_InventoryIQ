from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from .forecasting import (
        EXPORT_COLUMNS,
        add_mase_to_results,
        build_lightgbm_future_forecast,
        compare_models,
        prepare_forecast_input,
        run_feature_regression,
        run_lightgbm_global_lag,
        run_naive_baseline,
        run_rolling_average_baseline,
        split_by_recent_dates,
        validate_input_frame,
    )
except ImportError:
    from forecasting import (
        EXPORT_COLUMNS,
        add_mase_to_results,
        build_lightgbm_future_forecast,
        compare_models,
        prepare_forecast_input,
        run_feature_regression,
        run_lightgbm_global_lag,
        run_naive_baseline,
        run_rolling_average_baseline,
        split_by_recent_dates,
        validate_input_frame,
    )


def build_sample_sales_data() -> pd.DataFrame:
    rows = []
    dates = pd.date_range("2024-01-01", periods=500, freq="D")
    for store in [1, 2]:
        for item in [1, 2]:
            for day_index, date in enumerate(dates):
                weekly_pattern = 3 * np.sin(day_index / 7)
                rows.append(
                    {
                        "date": date,
                        "store": store,
                        "item": item,
                        "sales": 20 + (store * 4) + (item * 2) + weekly_pattern + (day_index * 0.05),
                    }
                )
    return pd.DataFrame(rows)


def train_test_split_time(
    df: pd.DataFrame,
    date_col: str,
    horizon: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if horizon <= 0:
        raise ValueError("horizon must be positive.")

    prepared = df.copy()
    prepared[date_col] = pd.to_datetime(prepared[date_col])
    unique_dates = sorted(prepared[date_col].dropna().unique())
    if len(unique_dates) <= horizon:
        raise ValueError(f"Need more than {horizon} dates to create a train/test split.")

    cutoff_date = unique_dates[-horizon]
    train_df = prepared[prepared[date_col] < cutoff_date].copy()
    test_df = prepared[prepared[date_col] >= cutoff_date].copy()
    return train_df, test_df


def load_input_frame(input_path: Path | None) -> pd.DataFrame:
    if input_path is None:
        return build_sample_sales_data()

    suffix = input_path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(input_path)
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(input_path)

    raise ValueError("Input file must be a CSV or Excel file.")


def _finalize_backtest_export(result) -> pd.DataFrame:
    export_df = result.forecast_df.copy()
    export_df["residual"] = export_df["actual"] - export_df["prediction"]
    export_df["method_name"] = result.method_name
    export_df = export_df.rename(columns={"store_id": "store", "product_id": "item"})
    return export_df[EXPORT_COLUMNS].sort_values(["date", "store", "item"]).reset_index(drop=True)


def build_forecast_export(
    df: pd.DataFrame,
    horizon: int,
    window: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Keep the original small baseline export contract for existing tests."""
    prepared = prepare_forecast_input(df)
    validate_input_frame(prepared)

    train_df, test_df = train_test_split_time(
        prepared,
        date_col="date",
        horizon=horizon,
    )

    naive_result = run_naive_baseline(
        train_df=train_df,
        test_df=test_df,
        group_cols=["store", "item"],
        target_col="sales",
        date_col="date",
    )
    rolling_result = run_rolling_average_baseline(
        train_df=train_df,
        test_df=test_df,
        group_cols=["store", "item"],
        target_col="sales",
        date_col="date",
        window=window,
    )
    feature_result = run_feature_regression(
        train_df=train_df,
        test_df=test_df,
        group_cols=["store", "item"],
        target_col="sales",
        date_col="date",
        lags=[1, 3],
        rolling_windows=[3],
    )

    results = [naive_result, rolling_result, feature_result]
    comparison_df = compare_models(results)
    winner_name = comparison_df.loc[comparison_df["selected_winner"], "method_name"].iloc[0]
    winner_result = next(result for result in results if result.method_name == winner_name)

    return _finalize_backtest_export(winner_result), comparison_df


def build_advanced_backtest_export(
    df: pd.DataFrame,
    horizon_days: int,
    model: str,
    window: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    prepared = prepare_forecast_input(df)
    train_df, test_df = split_by_recent_dates(prepared, horizon_days=horizon_days)

    results = []
    if model in {"baseline", "all"}:
        results.extend(
            [
                run_naive_baseline(train_df, test_df, ["store", "item"], "sales", "date"),
                run_rolling_average_baseline(train_df, test_df, ["store", "item"], "sales", "date", window=window),
                run_feature_regression(train_df, test_df, ["store", "item"], "sales", "date"),
            ]
        )
    if model in {"lightgbm", "all"}:
        results.append(run_lightgbm_global_lag(train_df, test_df))

    add_mase_to_results(results, train_df)
    comparison_df = compare_models(results)
    winner_name = comparison_df.loc[comparison_df["selected_winner"], "method_name"].iloc[0]
    winner_result = next(result for result in results if result.method_name == winner_name)
    export_df = _finalize_backtest_export(winner_result)
    comparison_df["evaluation_horizon_days"] = horizon_days
    comparison_df["evaluation_start_date"] = test_df["date"].min().date().isoformat()
    comparison_df["evaluation_end_date"] = test_df["date"].max().date().isoformat()
    return export_df, comparison_df


def build_future_export(
    df: pd.DataFrame,
    future_days: int,
    model: str,
) -> pd.DataFrame:
    if model == "lightgbm":
        return build_lightgbm_future_forecast(df, future_days=future_days)
    raise ValueError("Future export currently supports --model lightgbm.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export forecast CSV artifacts.")
    parser.add_argument("--input", type=Path, default=None, help="Optional path to a CSV or Excel sales file.")
    parser.add_argument("--output", type=Path, default=Path("outputs/forecasts.csv"), help="Output CSV path.")
    parser.add_argument(
        "--comparison-output",
        type=Path,
        default=Path("outputs/model_comparison.csv"),
        help="Optional model comparison output path for backtests.",
    )
    parser.add_argument(
        "--model",
        choices=["baseline", "lightgbm", "all"],
        default="baseline",
        help="Model family to run. Use lightgbm with --future-days for future forecasts.",
    )
    parser.add_argument("--horizon", type=int, default=7, help="Baseline row-count horizon for legacy mode.")
    parser.add_argument("--horizon-days", type=int, default=90, help="Calendar-day holdout horizon for advanced models.")
    parser.add_argument("--future-days", type=int, default=0, help="If set, export true future forecasts instead of a backtest.")
    parser.add_argument("--window", type=int, default=3, help="Window size for the rolling average baseline.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    df = load_input_frame(args.input)

    if args.future_days > 0:
        export_df = build_future_export(
            df=df,
            future_days=args.future_days,
            model=args.model,
        )
        comparison_df = None
    elif args.model == "baseline":
        export_df, comparison_df = build_forecast_export(
            df=df,
            horizon=args.horizon,
            window=args.window,
        )
    else:
        export_df, comparison_df = build_advanced_backtest_export(
            df=df,
            horizon_days=args.horizon_days,
            model=args.model,
            window=args.window,
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    export_df.to_csv(args.output, index=False)
    print(f"Wrote {len(export_df):,} rows to {args.output}")

    if comparison_df is not None:
        args.comparison_output.parent.mkdir(parents=True, exist_ok=True)
        comparison_df.to_csv(args.comparison_output, index=False)
        winner_row = comparison_df.loc[comparison_df["selected_winner"]].iloc[0]
        print(f"Wrote model comparison to {args.comparison_output}")
        print(f"Winning model: {winner_row['method_name']}")
        print(f"MAE: {winner_row['mae']:.3f}")
        print(f"RMSE: {winner_row['rmse']:.3f}")
        if "mase" in winner_row:
            print(f"MASE: {winner_row['mase']:.3f}")


if __name__ == "__main__":
    main()
