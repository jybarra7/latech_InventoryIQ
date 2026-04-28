import pandas as pd

df1 = pd.read_csv(r"C:\Users\krisn\OneDrive\Desktop\latech\data\train.csv")
print("TRAIN DATA:")
print(df1.head())

df2 = pd.read_excel(r"C:\Users\krisn\OneDrive\Desktop\walmart_project\walmart.xlsx")
print("\nWALMART DATA:")
print(df2.head())