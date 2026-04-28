import pandas as pd
from processor import load_and_clean_data
from trend import compute_trend

# Load dataset
df = pd.read_csv(r"C:\Users\krisn\OneDrive\Desktop\latech\data\train.csv")

# Process data
df = load_and_clean_data(df)

# Compute trend
result = compute_trend(df)

print("TREND RESULT:", result)