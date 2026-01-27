import pandas as pd
import numpy as np
import json
import os
from datetime import datetime

# Paths
RAW_DATA_PATH = '../../data/raw/TMDB_all_movies.csv'
CORE_DATA_PATH = '../../data/processed/movies_core.csv'
COLD_DATA_PATH = '../../data/processed/movies_cold.csv'

def main():
  print("=" * 60)
  print("Movie Dataset Normalization")
  print("=" * 60)
  
  # Load dataset
  print("\n[1/10] Loading dataset...")
  df = pd.read_csv(RAW_DATA_PATH)
  print(f"Loaded {len(df):,} movies")
  
  # Select needed columns
  needed_columns = [
    'id', 'imdb_id', 'title', 'genres', 'overview',
    'imdb_rating', 'imdb_votes', 'popularity',
    'release_date', 'original_language', 'budget', 'revenue',
    'production_companies', 'cast', 'director', 'runtime'
  ]
  df = df[needed_columns].copy()
  
  # Basic cleaning
  print("\n[2/10] Cleaning and Deduplication...")
  df = df[df['title'].notna()].copy()
  df['release_date_parsed'] = pd.to_datetime(df['release_date'], errors='coerce')
  df = df[df['release_date_parsed'].notna()].copy()
  
  # Temporal features
  df['year'] = df['release_date_parsed'].dt.year.astype(int)
  df['decade'] = (df['year'] // 10) * 10
  
  # Deduplication
  initial_count = len(df)
  # First dedupe by IMDb ID where available
  with_imdb = df[df['imdb_id'].notna()].drop_duplicates(subset=['imdb_id'], keep='first')
  no_imdb = df[df['imdb_id'].isna()]
  df = pd.concat([with_imdb, no_imdb], ignore_index=True)
  # Then dedupe by title/year (fallback)
  df = df.sort_values(['title', 'year', 'imdb_id'], na_position='last')
  df = df.drop_duplicates(subset=['title', 'year'], keep='first')
  print(f"Removed {initial_count - len(df):,} duplicates")
  
  # Rating logic
  df['has_imdb'] = df['imdb_rating'].notna()
  
  # Feature Parsing and Normalization
  print("\n[3/10] Parsing and Normalizing metadata...")
  df['genres_list'] = df['genres'].apply(parse_genres)
  df['has_genres'] = df['genres_list'].apply(bool)
  # Geners strings
  df['genres_str'] = df['genres_list'].apply(lambda x: '|'.join(x))
  df['primary_genre'] = df['genres_list'].apply(lambda x: x[0] if x else None)
  
  # Normalize names
  df['directors_list'] = df['director'].apply(parse_directors)
  df['directors_norm'] = df['directors_list'].apply(normalize_names)
  
  df['actors_list'] = df['cast'].apply(parse_cast)
  df['actors_norm'] = df['actors_list'].apply(normalize_names)
  
  df['directors_str'] = df['directors_norm'].apply(lambda x: '|'.join(x))
  df['actors_str'] = df['actors_norm'].apply(lambda x: '|'.join(x))
  
  # Production company normalization
  df['production_company_raw'] = df['production_companies'].apply(parse_production_company)
  df['production_company_norm'] = df['production_company_raw'].str.lower().str.strip()
  
  top_companies = df['production_company_norm'].value_counts().head(200).index
  df['production_company_final'] = df['production_company_norm'].where(
      df['production_company_norm'].isin(top_companies),
      'other'
  )
  
  # Runtime
  df['runtime_bucket'] = df['runtime'].apply(runtime_bucket)
  
  # Calculate Normalized Score
  print("\n[4/10] Calculating quality scores...")
  pop_mean = df['popularity'].mean()
  pop_std = df['popularity'].std()
  df['popularity_norm'] = (df['popularity'] - pop_mean) / (pop_std if pop_std > 0 else 1)
  df['votes_norm'] = np.log1p(df['imdb_votes'].fillna(0))

  df['score'] = (
      df['imdb_rating'].fillna(0) * df['votes_norm'] +
      df['popularity_norm'] * 0.3
  )
  
  # Selection (Core vs Cold)
  print("\n[5/10] Selecting Core and Cold-Start datasets...")
  
  today = pd.Timestamp.now()
  df_filtered = df[df['release_date_parsed'] <= today].copy()
  
  # Core Selection (Language Diversity Fallback)
  core_mask = (
    ((df_filtered['imdb_votes'] >= 50) & (df_filtered['imdb_rating'].notna())) |
    ((df_filtered['original_language'] != 'en') & (df_filtered['popularity'] >= 10))
  )
  movies_core = df_filtered[core_mask].nlargest(30000, 'score').copy()
  movies_core['is_core'] = True
  
  # Cold-Start Selection
  potential_cold = df_filtered.drop(movies_core.index)
  cold_mask = (
    potential_cold['has_genres'] & 
    (potential_cold['popularity'] >= 5) & 
    (potential_cold['runtime_bucket'] != 'unknown')
  )
  movies_cold = potential_cold[cold_mask].nlargest(100000, 'score').copy()
  movies_cold['is_core'] = False
  
  print(f"Selected {len(movies_core):,} core movies")
  print(f"Selected {len(movies_cold):,} cold-start movies")
  
  # Metadata and Versioning
  current_time = datetime.utcnow().isoformat()
  for dataset in [movies_core, movies_cold]:
    dataset['dataset_version'] = 'v1.0'
    dataset['normalized_at'] = current_time
    dataset['type'] = 'movie'

  # Prepare final column list for saving
  final_columns = [
    'movie_id', 'imdb_id', 'title', 'year', 'decade', 
    'genres_str', 'primary_genre', 'overview',
    'imdb_rating', 'imdb_votes', 'has_imdb', 'score',
    'popularity', 'runtime', 'runtime_bucket', 'budget', 'revenue',
    'directors_str', 'actors_str', 'production_company_final',
    'release_date', 'is_core', 'type', 'dataset_version', 'normalized_at'
  ]
  
  # Rename id to movie_id
  movies_core = movies_core.rename(columns={'id': 'movie_id'})
  movies_cold = movies_cold.rename(columns={'id': 'movie_id'})
  
  # Ensure all final columns exist
  for col in final_columns:
    if col not in movies_core.columns: movies_core[col] = None
    if col not in movies_cold.columns: movies_cold[col] = None
    
  # Save separate files
  print("\n[6/10] Saving datasets...")
  os.makedirs(os.path.dirname(CORE_DATA_PATH), exist_ok=True)
  
  movies_core[final_columns].to_csv(CORE_DATA_PATH, index=False)
  movies_cold[final_columns].to_csv(COLD_DATA_PATH, index=False)
  
  print(f"Saved Core to: {CORE_DATA_PATH}")
  print(f"Saved Cold to: {COLD_DATA_PATH}")
  
  # Final statistics
  print("\n" + "=" * 60)
  print("SUMMARY")
  print("=" * 60)
  print(f"Total processed:        {len(movies_core) + len(movies_cold):,}")
  print(f"Core movies:            {len(movies_core):,}")
  print(f"Cold movies:            {len(movies_cold):,}")
  print(f"Average Core Score:     {movies_core['score'].mean():.2f}")
  print(f"Average Cold Score:     {movies_cold['score'].mean():.2f}")
  print("\nNormalization complete!")
  print("=" * 60)

def parse_genres(genres_str):
  if pd.isna(genres_str) or genres_str == '' or genres_str == '[]':
    return []
  if isinstance(genres_str, str):
    return [g.strip() for g in genres_str.split(',') if g.strip()]
  return []

def parse_cast(cast_str):
  if pd.isna(cast_str) or cast_str == '':
    return []
  if isinstance(cast_str, str):
    return [a.strip() for a in cast_str.split(',') if a.strip()]
  return []

def parse_production_company(companies_str):
  if pd.isna(companies_str) or companies_str == '':
    return ""
  if isinstance(companies_str, str):
    companies = [c.strip() for c in companies_str.split(',') if c.strip()]
    return companies[0] if companies else ""
  return ""

def parse_directors(director_str):
  if pd.isna(director_str) or director_str == '':
    return []
  if isinstance(director_str, str):
    return [d.strip() for d in director_str.split(',') if d.strip()]
  return []

def runtime_bucket(x):
  if pd.isna(x) or x == 0: return 'unknown'
  if x < 90: return 'short'
  if x <= 130: return 'normal'
  return 'long'

def normalize_names(lst):
  return list(dict.fromkeys([x.lower().strip() for x in lst]))


if __name__ == "__main__":
  main()