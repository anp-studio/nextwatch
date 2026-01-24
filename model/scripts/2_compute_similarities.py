"""
Compute cosine similarity matrix for core movies and shows
"""
import sys
sys.path.append('..')

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.feature_extraction.text import TfidfVectorizer
import ast
import json
# from utils.db import get_db_connection  # Not needed yet
from datetime import datetime

def main():
  print("=" * 60)
  print("COSINE SIMILARITY COMPUTATION")
  print("=" * 60)

  # Load processed data
  print("\n[1/6] Loading normalized datasets...")

  movies_df = pd.read_csv('../data/processed/movies_normalized.csv')
  shows_df = pd.read_csv('../data/processed/shows_normalized.csv')
  
  # Rename show_id to id for consistency
  if 'show_id' in shows_df.columns:
    shows_df.rename(columns={'show_id': 'id'}, inplace=True)
  if 'movie_id' in movies_df.columns:
    movies_df.rename(columns={'movie_id': 'id'}, inplace=True)

  # Add type column
  movies_df['type'] = 'movie'
  shows_df['type'] = 'show'

  df = pd.concat([movies_df, shows_df], ignore_index=True)

  print(f"Loaded {len(movies_df):,} movies")
  print(f"Loaded {len(shows_df):,} shows")
  print(f"Total items: {len(df):,}")

   # Filter only core items
  print("\n[2/6] Filtering core items...")
  core_df = df[df['is_core'] == True].copy()
  
  # Remove items with null id
  null_ids = core_df['id'].isnull().sum()
  if null_ids > 0:
    print(f"  Found {null_ids} items with null id - removing them")
    core_df = core_df[core_df['id'].notna()].copy()

  core_movies = len(core_df[core_df['type'] == 'movie'])
  core_shows = len(core_df[core_df['type'] == 'show'])

  print(f"Core movies: {core_movies:,}")
  print(f"Core shows: {core_shows:,}")
  print(f"Total core items: {len(core_df):,}")

  # desavalo se i ovo
  if len(core_df) == 0:
    print("ERROR: No core items found!")
    return

  # Parse string lists back to Python lists
  print("\n[3/6] Parsing features...")
  core_df['genres'] = core_df['genres'].apply(safe_literal_eval)
  core_df['keywords'] = core_df['keywords'].apply(safe_literal_eval)

  print(f"Parsed genres and keywords")

  print("\n[4/6] Creating feature vectors...")
  feature_matrix = create_feature_vectors(core_df)

  print(f"Feature matrix shape: {feature_matrix.shape}")
  print(f"  {feature_matrix.shape[0]} items × {feature_matrix.shape[1]} features")

  # Compute cosine similarity
  print("\n[5/6] Computing cosine similarity matrix...")

  # ovo je za mene da vidim koliko traje
  start_time = datetime.now()
  similarity_matrix = cosine_similarity(feature_matrix)
  elapsed = (datetime.now() - start_time).total_seconds()

  print(f"  Similarity matrix computed in {elapsed:.1f} seconds")
  print(f"Matrix shape: {similarity_matrix.shape}")

  # Save similarity matrix
  # treba u supabase kada budemo imali tabelu
  print("\n[6/6] Saving similarity matrix...")
  save_similarity_matrix(similarity_matrix, core_df)
  
  print("\n" + "=" * 60)
  print("✅ SIMILARITY COMPUTATION COMPLETE!")
  print("=" * 60)


def safe_literal_eval(val):
  """Safely evaluate string representation of list"""
  if pd.isna(val):
    return []
  if isinstance(val, list):
    return val
  try:
    return ast.literal_eval(val)
  except:
    return []

def create_feature_vectors(df):
  """
  Create feature vectors from genres, keywords, type, rating, popularity, and overview
  
  Features:
  - Genres (one-hot)
  - Keywords (one-hot)
  - Overview (TF-IDF)
  - Type (movie vs show)
  - Rating (normalized and weighted)
  - Popularity (normalized and weighted)
  - Vote count (normalized, to favor well-rated items)
  """

  print("  Creating genre features...")

  # Genre features
  mlb_genres = MultiLabelBinarizer()
  genre_features = mlb_genres.fit_transform(df['genres'])
  print(f"    {len(mlb_genres.classes_)} unique genres")

  print("  Creating keyword features...")
  # Keyword features
  mlb_keywords = MultiLabelBinarizer()
  keyword_features = mlb_keywords.fit_transform(df['keywords'])
  print(f"    {len(mlb_keywords.classes_)} unique keywords")
  
  print("  Creating overview (description) features...")
  # Overview features using TF-IDF
  # Fill missing overviews with empty string
  overviews = df['overview'].fillna('').values
  
  # TF-IDF with parameters optimized for movie descriptions
  tfidf = TfidfVectorizer(
    max_features=500,        # Limit to top 500 words to avoid overfitting
    stop_words='english',    # Remove common English words
    ngram_range=(1, 2),      # Use unigrams and bigrams for better context
    min_df=2,                # Word must appear in at least 2 documents
    max_df=0.8               # Ignore words that appear in >80% of documents
  )
  overview_features = tfidf.fit_transform(overviews).toarray()
  print(f"    {overview_features.shape[1]} TF-IDF features from overviews")

  print("  Creating type features...")
  # Type features (binary: is_movie)
  type_features = (df['type'] == 'movie').astype(int).values.reshape(-1, 1)

  print("  Creating rating features...")
  # Rating features (normalized 0-1, heavily weighted)
  rating_features = df['vote_average'].fillna(5.0).values.reshape(-1, 1)
  rating_features = rating_features / 10.0
  
  print("  Creating popularity features...")
  # Popularity features (log-normalized to reduce outliers)
  popularity_features = df['popularity'].fillna(1.0).values.reshape(-1, 1)
  popularity_features = np.log1p(popularity_features)  # log(1+x) to handle zeros
  popularity_features = popularity_features / np.max(popularity_features)  # normalize to 0-1
  
  print("  Creating vote count features...")
  # Vote count features (log-normalized, to favor movies with more votes)
  vote_count_features = df['vote_count'].fillna(1.0).values.reshape(-1, 1)
  vote_count_features = np.log1p(vote_count_features)
  vote_count_features = vote_count_features / np.max(vote_count_features)

  # Combine all features with weights
  # mozemo ovo da menjamo kasnije po potrebi
  print("  Combining features with weights...")
  feature_matrix = np.hstack([
    genre_features * 3.0,           # Genre similarity is important
    keyword_features * 2.0,          # Keywords are important but less than genres
    overview_features * 4.0,         # NEW: Overview/plot similarity is very important!
    type_features * 1.5,             # Movie vs Show preference
    rating_features * 3.5,           # INCREASED: Quality matters a lot
    popularity_features * 1.5,       # NEW: Popular items are more relevant
    vote_count_features * 1.5        # NEW: Well-voted items are more trustworthy
  ])

  return feature_matrix

def save_similarity_matrix(matrix, df, top_n=100):
  """
  Save top N most similar items for each movie/show
  Format: id, similar_id, similarity_score
  """
  ids = df['id'].values
  
  results = []
  skipped_null_ids = 0
  
  print(f"  Extracting top {top_n} similar items for each movie/show...")
  for i, item_id in enumerate(ids):
    # Skip if id is NaN
    if pd.isna(item_id):
      skipped_null_ids += 1
      continue
    
    # Get similarity scores for this item
    similarities = matrix[i].copy()
    
    # Set self-similarity to -1 so it won't be selected
    similarities[i] = -1
    
    # Clip scores to [0, 1] to fix floating point errors
    similarities = np.clip(similarities, 0, 1)
    
    # Get indices of top N most similar
    top_indices = np.argsort(similarities)[::-1][:top_n]
    
    # Create rows for each similar item
    for idx in top_indices:
      similar_id = ids[idx]
      score = similarities[idx]
      
      # Skip if similar_id is NaN or score is negative (should not happen but safety check)
      if pd.isna(similar_id) or score < 0:
        continue
      
      results.append({
        'id': int(item_id),
        'similar_id': int(similar_id),
        'similarity_score': float(score)
      })
    
    # Progress indicator every 1000 items
    if (i + 1) % 1000 == 0:
      print(f"    Processed {i + 1:,} / {len(ids):,} items...")
  
  # Convert to DataFrame and save
  results_df = pd.DataFrame(results)
  results_df.to_csv('../data/processed/similarity_matrix.csv', index=False)
  
  if skipped_null_ids > 0:
    print(f"  Skipped {skipped_null_ids} items with null IDs")
  
  print(f"  Saved {len(results_df):,} similarity pairs to '../data/processed/similarity_matrix.csv'")
  print(f"  Score range: [{results_df['similarity_score'].min():.4f}, {results_df['similarity_score'].max():.4f}]")
  print(f"  File size: {len(results_df) * 3 * 8 / 1024 / 1024:.1f} MB (approximate)")

if __name__ == "__main__":
  main()