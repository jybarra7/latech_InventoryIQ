import pandas as pd
from processor import load_and_clean_data

# Load dataset
df = pd.read_csv(r"C:\Users\krisn\OneDrive\Desktop\latech\data\train.csv")

# Run processor
clean_df = load_and_clean_data(df)

# Show results
print(clean_df.head())

print("\nCOLUMNS:")
print(clean_df.columns)