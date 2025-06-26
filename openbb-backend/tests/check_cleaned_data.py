import pandas as pd

# Read the progress file
df = pd.read_csv('/tmp/cleaning_progress_batch_15_20250624_193518.csv')

print(f'Total rows: {len(df)}')
print(f'\nColumns: {list(df.columns)}')
print(f'\nData sources:')
print(df['data_source'].value_counts())

# Show cleaned companies
print(f'\nSample cleaned companies:')
cleaned = df[df['data_source'] != 'original']
print(f'Total cleaned: {len(cleaned)}')

for idx, row in cleaned.head(10).iterrows():
    orig = str(row['original_name'])
    print(f'\nOriginal: {orig[:60]}...' if len(orig) > 60 else f'\nOriginal: {orig}')
    print(f'Cleaned: {row["cleaned_name"]}')
    print(f'Source: {row["data_source"]}')
    print(f'Confidence: {row["confidence"]}')

# Show extraction examples
extracted = df[df['data_source'] == 'extracted']
print(f'\n\nExtracted names: {len(extracted)}')
for idx, row in extracted.head(5).iterrows():
    orig = str(row['original_name'])
    print(f'\nOriginal: {orig[:80]}...' if len(orig) > 80 else f'\nOriginal: {orig}')
    print(f'Extracted: {row["cleaned_name"]}')