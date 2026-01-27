"""
Compute cosine similarity matrix for core movies and shows - V2
"""
import sys
sys.path.append('../..')

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer
from sentence_transformers import SentenceTransformer
import ast
import json
from datetime import datetime

def main():
  print("=" * 60)
  print("COSINE SIMILARITY COMPUTATION")
  print("=" * 60)

  # Load processed data
  print("\n[1/6] Loading normalized datasets...")

  movies_df = pd.read_csv('../../data/processed/movies_core.csv')
  shows_df = pd.read_csv('../../data/processed/shows_normalized.csv')
  
  # Rename columns for consistency
  if 'movie_id' in movies_df.columns:
    movies_df.rename(columns={'movie_id': 'id'}, inplace=True)
  
  if 'show_id' in shows_df.columns:
    shows_df.rename(columns={'show_id': 'id'}, inplace=True)

  # Prevent ID collisions with prefixes
  movies_df['id'] = 'm_' + movies_df['id'].astype(str)
  shows_df['id'] = 's_' + shows_df['id'].astype(str)

  # Ensure IMDb columns exist in shows_df (rename if needed)
  if 'vote_average' in shows_df.columns and 'imdb_rating' not in shows_df.columns:
    shows_df.rename(columns={'vote_average': 'imdb_rating'}, inplace=True)
  if 'vote_count' in shows_df.columns and 'imdb_votes' not in shows_df.columns:
    shows_df.rename(columns={'vote_count': 'imdb_votes'}, inplace=True)

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
  # moguce da je bio corrupt dataset
  if len(core_df) == 0:
    print("ERROR: No core items found!")
    return

  # Parse string lists back to Python lists
  print("\n[3/6] Parsing features...")
  def parse_genres_hybrid(row):
    if row['type'] == 'movie':
      val = row['genres_str']
      # Handle potential non-standard delimiters or brackets
      if isinstance(val, str) and val:
        # Check for brackets
        val = val.replace('[', '').replace(']', '').replace("'", "").replace('"', "")
        return [g.strip() for g in val.split('|') if g.strip()]
      return []
    else:
      # For shows
      return safe_literal_eval(row['genres'])

  core_df['genres_list'] = core_df.apply(parse_genres_hybrid, axis=1)
  # Pre-calculate genres string for fast processing
  core_df['genres_str'] = core_df['genres_list'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')

  print(f"Parsed genres")

  print("\n[4/6] Creating feature vectors...")
  feature_matrix = create_feature_vectors(core_df)

  print(f"Feature matrix shape: {feature_matrix.shape}")
  print(f"  {feature_matrix.shape[0]} items × {feature_matrix.shape[1]} features")

  # Compute cosine similarity using batch processing
  print("\n[5/6] Computing cosine similarity matrix (Batch-wise)...")
  
  n_items = feature_matrix.shape[0]
  similarity_matrix = np.zeros((n_items, n_items), dtype=np.float32)
  batch_size = 1000 # Adjust based on available RAM
  
  start_time = datetime.now()
  
  for start_idx in range(0, n_items, batch_size):
    end_idx = min(start_idx + batch_size, n_items)
    
    batch_sims = cosine_similarity(feature_matrix[start_idx:end_idx], feature_matrix)
    
    similarity_matrix[start_idx:end_idx] = batch_sims.astype(np.float32)
    
    if (start_idx // batch_size) % 5 == 0:
      print(f"  Processed {end_idx}/{n_items} rows...")

  elapsed = (datetime.now() - start_time).total_seconds()

  print(f"  Similarity matrix computed in {elapsed:.1f} seconds")
  print(f"Matrix shape: {similarity_matrix.shape}")
  
  # Apply sequel/franchise boosting
  print("\n[5.5/6] Applying sequel/franchise boosting...")
  similarity_matrix = apply_sequel_boost(similarity_matrix, core_df)

  # Save similarity matrix
  # TODO: treba u supabase kada budemo imali tabelu
  print("\n[6/6] Saving similarity matrix...")
  start_time = datetime.now()
  save_similarity_matrix(similarity_matrix, core_df)
  elapsed = (datetime.now() - start_time).total_seconds()
  print(f"  Similarity matrix saved in {elapsed:.1f} seconds")
  
  print("\n" + "=" * 60)
  print("SIMILARITY COMPUTATION COMPLETE!")
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

def extract_franchise_name(title):
  """Extract base franchise name from title (remove Part, Episode, numbers, etc.)"""
  import re
  
  if pd.isna(title):
    return ""
  
  # Convert to lowercase for comparison
  title_lower = title.lower()
  
  # Remove common sequel indicators
  patterns = [
    r'\s*part\s+[ivxlcdm0-9]+.*$',      # Part II, Part 2, Part III
    r'\s*:\s*part\s+[ivxlcdm0-9]+.*$',  # : Part II
    r'\s*-\s*part\s+[ivxlcdm0-9]+.*$',  # - Part II
    r'\s*episode\s+[ivxlcdm0-9]+.*$',   # Episode II
    r'\s*chapter\s+[0-9]+.*$',          # Chapter 2
    r'\s*[ivxlcdm]+\s*$',               # Roman numerals at end (III, IV)
    r'\s*[0-9]+\s*$',                   # Numbers at end (2, 3)
    r'\s*\([0-9]+\)\s*$',               # (2), (3) at end
  ]
  
  base_title = title_lower
  for pattern in patterns:
    base_title = re.sub(pattern, '', base_title)
  
  return base_title.strip()

def apply_sequel_boost(similarity_matrix, df):
  """
  Boost similarity scores for movies that are likely sequels/prequels/in same franchise
  """
  print("  Analyzing franchise relationships...")
  
  titles = df['title'].values
  release_dates = df['release_date'].values
  
  # Extract franchise names
  franchise_names = [extract_franchise_name(title) for title in titles]
  
  boosted_count = 0
  
  # Group items by franchise
  franchise_groups = {}
  for i, name in enumerate(franchise_names):
    if name and len(name) > 3:
      if name not in franchise_groups:
        franchise_groups[name] = []
      franchise_groups[name].append(i)
  
  # Apply boost using optimized numpy indexing
  for name, indices in franchise_groups.items():
    if len(indices) < 2:
      continue
    
    # Create a meshgrid of indices for this franchise
    idx_grid = np.ix_(indices, indices)
    
    # Apply boost: multiply by 1.5, add 0.3, cap at 1.0
    # Only apply to off-diagonal elements (handled by logic, but robust here)
    franchise_submatrix = similarity_matrix[idx_grid]
    
    # Vectorized update
    boosted_submatrix = np.minimum(1.0, franchise_submatrix * 1.5 + 0.3)
    
    # Update the main matrix
    similarity_matrix[idx_grid] = boosted_submatrix
    
    # Count pairs (approximate)
    n = len(indices)
    boosted_count += (n * (n-1)) // 2
  
  print(f"  Applied franchise boost to approx {boosted_count} pairs")
  
  return similarity_matrix

def create_feature_vectors(df):
  """
  Create feature vectors from multiple features
  
  Features:
  - Genres (one-hot) - TODO: TF-IDF
  - Overview (semantic embedding)
  - Type (movie vs show)
  - Rating (normalized and weighted)
  - Popularity (normalized and weighted)
  - Vote count (normalized)
  - Release date (year, normalized)
  - Budget (log-normalized)
  - Revenue (log-normalized)
  - Is core (binary)
  """

  print("  Creating genre features...")

  # Genre features
  mlb_genres = MultiLabelBinarizer()
  genre_features = mlb_genres.fit_transform(df['genres_list'])
  print(f"    {len(mlb_genres.classes_)} unique genres")

  print("  Creating overview (description) features...")
  # Overview features using Sentence Transformers for semantic understanding
  # Check for cached embeddings to speed up batching
  # If cache exists, verify if it matches current data (check IDs)
  # If not, recompute embeddings
  cache_file = '../../data/processed/overview_embeddings_cache_v2.pkl'
  import os
  import pickle
  
  cached_data = None
  features_loaded = False
  
  if os.path.exists(cache_file):
    print(f"    Found cache file: {cache_file}")
    try:
      with open(cache_file, 'rb') as f:
        cached_data = pickle.load(f)
      
      # Check if cache matches current data
      cached_ids = cached_data.get('ids')
      cached_hash = cached_data.get('content_hash')
      
      # Verify IDs match
      ids_match = np.array_equal(cached_ids, df['id'].values)
      
      # Verify content hash (if available in cache)
      import hashlib
      current_content_hash = hashlib.sha256(pd.util.hash_pandas_object(df['overview'].fillna('')).values).hexdigest()
      hash_match = cached_hash == current_content_hash if cached_hash else True
      
      if ids_match and hash_match:
        print("    Cache found! Loading pre-computed embeddings...")
        overview_features = cached_features
        features_loaded = True
      else:
        print(f"    Cache mismatch (IDs or content changed). Recomputing...")
    except Exception as e:
      print(f"    Error reading cache: {e}")
  
  if not features_loaded:
    # Fill missing overviews with empty string
    overviews = df['overview'].fillna('').values
    
    # Load sentence transformer model (lightweight and fast)
    print("    Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Generate embeddings
    print("    Generating semantic embeddings for overviews...")
    overview_features = model.encode(overviews, show_progress_bar=True, batch_size=32)
    
    # Save to cache
    print(f"    Saving embeddings to cache: {cache_file}")
    # Calculate hash of all overviews to verify data consistency
    import hashlib
    current_content_hash = hashlib.sha256(pd.util.hash_pandas_object(df['overview'].fillna('')).values).hexdigest()
    
    try:
      with open(cache_file, 'wb') as f:
        pickle.dump({
          'ids': df['id'].values,
          'content_hash': current_content_hash,
          'features': overview_features
        }, f)
    except Exception as e:
      print(f"    Error saving cache: {e}")
      
  print(f"    {overview_features.shape[1]} semantic features from overviews")

  print("  Creating type features...")
  # Type features is_movie (binary)
  type_features = (df['type'] == 'movie').astype(int).values.reshape(-1, 1)

  print("  Creating rating features...")
  # Rating features
  rating_features = df['imdb_rating'].fillna(5.0).values.reshape(-1, 1)
  rating_features = rating_features / 10.0
  
  print("  Creating popularity features...")
  # Popularity features
  popularity_features = df['popularity'].fillna(1.0).values.reshape(-1, 1)
  popularity_features = np.log1p(popularity_features) 
  popularity_features = popularity_features / np.max(popularity_features) 
  
  print("  Creating vote count features...")
  # Vote count features
  vote_count_features = df['imdb_votes'].fillna(1.0).values.reshape(-1, 1)
  vote_count_features = np.log1p(vote_count_features)
  vote_count_features = vote_count_features / np.max(vote_count_features)
  
  print("  Creating release date features...")
  # Extract year from release_date and normalize
  df['release_year'] = pd.to_datetime(df['release_date'], errors='coerce').dt.year
  release_year_features = df['release_year'].fillna(2000).values.reshape(-1, 1)
  
  # Min-Max normalization
  min_year = release_year_features.min()
  max_year = release_year_features.max()
  if max_year > min_year:
      release_year_features = (release_year_features - min_year) / (max_year - min_year)
  else:
      release_year_features = np.zeros_like(release_year_features)
  
  print("  Creating budget features...")
  # Budget tier system
  def budget_tier(budget):
    """Categorize budget into tiers to preserve meaningful differences"""
    if budget == 0: return 0
    if budget < 5_000_000: return 1      # Ultra low budget (<$5M)
    if budget < 20_000_000: return 2     # Low budget ($5-20M)
    if budget < 50_000_000: return 3     # Medium budget ($20-50M)
    if budget < 100_000_000: return 4    # High budget ($50-100M)
    if budget < 200_000_000: return 5    # Very high budget ($100-200M)
    return 6                              # Blockbuster ($200M+)
  
  budget_values = df['budget'].fillna(0) if 'budget' in df.columns else pd.Series([0] * len(df))
  budget_tiers = budget_values.apply(budget_tier).values.reshape(-1, 1)
  budget_tiers = budget_tiers / 6.0  # Normalize to 0-1
  
  print("  Creating revenue features...")
  # Revenue tier system (similar to budget)
  def revenue_tier(revenue):
    """Categorize revenue into tiers"""
    if revenue == 0: return 0
    if revenue < 10_000_000: return 1     # Flop (<$10M)
    if revenue < 50_000_000: return 2     # Low earner ($10-50M)
    if revenue < 200_000_000: return 3    # Moderate hit ($50-200M)
    if revenue < 500_000_000: return 4    # Big hit ($200-500M)
    if revenue < 1_000_000_000: return 5  # Blockbuster ($500M-1B)
    return 6                               # Mega blockbuster ($1B+)
  
  revenue_values = df['revenue'].fillna(0) if 'revenue' in df.columns else pd.Series([0] * len(df))
  revenue_tiers = revenue_values.apply(revenue_tier).values.reshape(-1, 1)
  revenue_tiers = revenue_tiers / 6.0  # Normalize to 0-1
  
  print("  Creating is_core features...")
  # Is core feature (binary)
  is_core_features = df['is_core'].astype(int).values.reshape(-1, 1)
  
  print("  Creating animation detection features...")
  # Animation detection (binary feature)
  animation_features = detect_animation(df).reshape(-1, 1)

  # Combine all features with weights
  print("  Combining features with weights...")
  feature_matrix = np.hstack([
    genre_features * 4.0,            # UP from 3.0 - genre is crucial
    overview_features * 5.0,         # UP from 2.0 - semantic embeddings are high quality
    type_features * 1.5,             # Movie vs Show preference
    rating_features * 6.0,           # UP from 5.0 - quality is crucial
    popularity_features * 3.5,       # UP from 2.5 - popular films are quality indicator
    vote_count_features * 2.5,       # UP from 2.0 - well-established films
    release_year_features * 2.0,     # Similar era films
    budget_tiers * 4.0,              # KEEP at 4.0
    revenue_tiers * 2.0,             # Box office success matters
    is_core_features * 0.5,          # Slight preference for core items
    animation_features * 3.0         # NEW: Animation style matters
  ])

  return feature_matrix

def save_similarity_matrix(matrix, df, top_n=100):
  """
  Save top N most similar items for each movie/show
  Format: id, similar_id, type, similar_type, similarity_score
  
  V2 POST-FILTERING: Apply penalties for quality mismatches
  - Animation style mismatch: multiply by 0.3 (configurable)
  - Large rating differences (> 2.0): multiply by 0.2 (stricter than v1)
  - Non-core movies with low popularity: multiply by 0.1
  - Large budget mismatches (> 10x or < 0.1x): multiply by 0.4
  """
  ids = df['id'].values
  ratings = df['imdb_rating'].values
  vote_counts = df['imdb_votes'].values
  popularities = df['popularity'].values
  budgets = df['budget'].fillna(0).values
  is_core = df['is_core'].values
  types = df['type'].values
  
  # Detect animation for penalty
  is_animated = detect_animation(df)
  
  results = []
  skipped_null_ids = 0
  penalties_applied = 0
  
  print(f"  Extracting top {top_n} similar items for each movie/show...")
  for i, item_id in enumerate(ids):
    if pd.isna(item_id):
      skipped_null_ids += 1
      continue
    
    # Get similarity scores for this item
    similarities = matrix[i].copy()
    # Set self-similarity to -1 so it won't be selected
    similarities[i] = -1
    # Clip scores to [0, 1] to fix floating point errors
    similarities = np.clip(similarities, 0, 1)
    
    # OPTIMIZATION: Only apply penalties to top 250 candidates
    # This avoids processing 30,000 items for every movie
    candidate_indices = np.argsort(similarities)[::-1][:250]
    
    # POST-FILTERING: Apply quality penalties
    for j in candidate_indices:
      if j == i or similarities[j] <= 0:
        continue
      
      original_score = similarities[j]
      penalty_multiplier = 1.0
      
      # Penalty 1: Animation style mismatch
      if is_animated[i] != is_animated[j]:
        penalty_multiplier *= 0.3  # ovo je poprilicno jako
        penalties_applied += 1
      
      # Penalty 2: Large rating difference
      rating_diff = abs(ratings[i] - ratings[j])
      if rating_diff > 2.0:
        penalty_multiplier *= 0.2
        penalties_applied += 1
      
      # Penalty 3: Low Quality / Popularity Filter
      is_weak = False
      if types[j] == 'show':
        if popularities[j] < 15 and vote_counts[j] < 20:
          is_weak = True
      else:
        if popularities[j] < 10 and (vote_counts[j] < 100 and budgets[j] == 0):
          is_weak = True
      
      if is_weak:
        penalty_multiplier *= 0.1
        penalties_applied += 1
      
      # Penalty 4: Large budget mismatch
      budget_i = budgets[i]
      budget_j = budgets[j]
      if budget_i > 0 and budget_j > 0:
        budget_ratio = budget_j / budget_i
        if budget_ratio > 10.0 or budget_ratio < 0.1:
          penalty_multiplier *= 0.4
          penalties_applied += 1
      
      # Apply combined penalty
      if penalty_multiplier < 1.0:
        similarities[j] = original_score * penalty_multiplier
    
    # Get indices of top N most similar
    top_indices = np.argsort(similarities)[::-1][:top_n]
    
    # Create rows for each similar item
    for idx in top_indices:
      similar_id = ids[idx]
      score = similarities[idx]
      
      # Skip if similar_id is NaN or score is negative
      if pd.isna(similar_id) or score < 0:
        continue
      
      results.append({
        'id': str(item_id),
        'similar_id': str(similar_id),
        'type': types[i],
        'similar_type': types[idx],
        'similarity_score': float(score)
      })
    
    # Progress indicator
    if (i + 1) % 1000 == 0:
      print(f"    Processed {i + 1:,} / {len(ids):,} items...")
  
  # Convert to DataFrame and save
  results_df = pd.DataFrame(results)
  results_df.to_csv('../../data/processed/similarity_matrix.csv', index=False)
  
  if skipped_null_ids > 0:
    print(f"  Skipped {skipped_null_ids} items with null IDs")
  
  print(f"  Applied {penalties_applied:,} quality penalties (animation, rating diff, popularity, budget)")
  print(f"  Saved {len(results_df):,} similarity pairs to '../../data/processed/similarity_matrix.csv'")
  print(f"  Score range: [{results_df['similarity_score'].min():.4f}, {results_df['similarity_score'].max():.4f}]")
  print(f"  File size: {len(results_df) * 3 * 8 / 1024 / 1024:.1f} MB (approximate)")

def detect_animation(df):
  """
  Detect if a movie/show is animated based on keywords and overview
  Returns binary array (1 = animated, 0 = live-action)
  """
  animation_keywords = ['anime', 'animation', 'animated', 'cartoon', 'cgi', 'pixar', 'dreamworks']
  
  # Combine text fields
  genres_text = df['genres_str'] if 'genres_str' in df.columns else df['genres_list'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
  
  combined_text = (df['overview'].fillna('') + ' ' + genres_text.fillna('')).str.lower()
  
  # Check for keywords
  pattern = '|'.join(animation_keywords)
  is_animated = combined_text.str.contains(pattern, case=False, regex=True).astype(int).values
  
  return is_animated

if __name__ == "__main__":
  main()