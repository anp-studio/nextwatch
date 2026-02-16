'''
This script reads the similarity matrix CSV, extracts numeric IDs, encodes the type combinations into a single integer,
and saves an optimized version of the CSV with reduced memory usage.

Used only when formating old CSV files, not needed for new ones.
'''

import pandas as pd

df = pd.read_csv('../data/processed/similarity_matrix.csv')

# strip leading "m_" or "s_" from ids (if present) then extract numeric id
df['id'] = df['id'].astype(str).str.replace(r'^[ms]_', '', regex=True).str.extract(r'(\d+)').astype(int)
df['similar_id'] = df['similar_id'].astype(str).str.replace(r'^[ms]_', '', regex=True).str.extract(r'(\d+)').astype(int)

# 0 = movie-movie
# 1 = show-show
# 2 = movie-show
# 3 = show-movie
type_map = {
    ('movie', 'movie'): 0,
    ('show', 'show'): 1,
    ('movie', 'show'): 2,
    ('show', 'movie'): 3
}

df['type'] = df.apply(lambda row: type_map[(row['type'], row['similar_type'])], axis=1)

# cast to compact dtypes for memory/disk savings
# ids fit in 32-bit signed int, type fits in uint8 (0-3), similarity_score -> float32
df['id'] = df['id'].astype('int32')
df['similar_id'] = df['similar_id'].astype('int32')
df['type'] = df['type'].astype('uint8')

if 'similarity_score' not in df.columns:
    raise KeyError("expected column 'similarity_score' not found in CSV")

df['similarity_score'] = df['similarity_score'].astype('float32')

# select optimized columns and write output next to the original
df_optimized = df[['id', 'similar_id', 'type', 'similarity_score']]
(df_optimized).to_csv('../data/processed/similarity_matrix_optimized.csv', index=False)

print(f"Original size: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
print(f"Optimized size: {df_optimized.memory_usage(deep=True).sum() / 1024**2:.2f} MB")