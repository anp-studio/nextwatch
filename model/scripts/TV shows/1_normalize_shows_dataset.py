"""
Normalize Kaggle TMDB TV Shows dataset - Extract only what's needed for ML
"""
import pandas as pd
import sys
import os
from datetime import datetime

# Add parent directory to path to import shared functions
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Paths
RAW_DATA_PATH = '../../data/raw/TMDB_tv_dataset_v3.csv'
PROCESSED_DATA_PATH = '../../data/processed/shows_normalized.csv'

def main():
    print("=" * 60)
    print("TMDB TV Shows Dataset Normalization")
    print("=" * 60)
    
    # Load dataset
    print("\n[1/7] Loading dataset...")
    df = pd.read_csv(RAW_DATA_PATH)
    print(f"Loaded {len(df):,} TV shows")
    print(f"Columns: {len(df.columns)}")
    
    # Select needed columns
    print("\n[2/7] Selecting needed columns...")
    needed_columns = [
        'id',
        'name',
        'genres',
        'overview',
        'vote_average',
        'vote_count',
        'popularity',
        'first_air_date',
        'original_language',
        'number_of_seasons',
        'number_of_episodes'
    ]
    
    df = df[needed_columns].copy()
    print(f"Reduced to {len(df.columns)} columns")
    
    # Basic cleaning
    print("\n[3/7] Cleaning data...")
    
    # Remove rows without name
    df = df[df['name'].notna()].copy()
    
    # Remove rows without ID
    df = df[df['id'].notna()].copy()
    df['id'] = df['id'].astype(int)
    
    # Fill missing values
    df['overview'] = df['overview'].fillna('')
    df['vote_average'] = df['vote_average'].fillna(0)
    df['vote_count'] = df['vote_count'].fillna(0)
    df['popularity'] = df['popularity'].fillna(0)
    df['original_language'] = df['original_language'].fillna('en')
    
    print(f"Cleaned to {len(df):,} TV shows")
    
    # Parse genre fields (no keywords in TV dataset)
    print("\n[4/7] Parsing genres...")
    df['genres_list'] = df['genres'].apply(parse_genres)
    
    # Statistics before filtering
    shows_with_genres = (df['genres_list'].apply(len) > 0).sum()
    print(f"TV shows with genres: {shows_with_genres:,}")
    
    # Filter TV shows
    print("\n[5/7] Filtering quality TV shows...")
    # Criteria:
    # - (At least 10 votes AND has rating > 0) OR (Popularity >= 10)
    # - Has at least 1 genre
    # - Already aired (not future releases)
    
    # Parse air dates and filter out future releases
    df['first_air_date_parsed'] = pd.to_datetime(df['first_air_date'], errors='coerce')
    today = pd.Timestamp.now()
    
    df_filtered = df[
        (
            ((df['vote_count'] >= 10) & (df['vote_average'] > 0)) |  # Established shows
            (df['popularity'] >= 10)  # Popular shows (even without votes yet)
        ) &
        (df['genres_list'].apply(len) > 0) &  # Must have genres
        ((df['first_air_date_parsed'].isna()) | (df['first_air_date_parsed'] <= today))  # Only aired shows
    ].copy()
    
    print(f"Filtered to {len(df_filtered):,} quality TV shows")
    
    # Mark shows for similarity computation
    print("\n[6/7] Selecting core TV shows for similarity computation...")
    print("Core show criteria:")
    print("  - Top 10,000 shows by popularity")
    print("  - From all quality shows (regardless of vote count)")
    
    df_filtered['is_core'] = False
    
    # Select top 10k by popularity (dataset has less than 20k shows)
    if len(df_filtered) >= 10000:
        core_shows = df_filtered.nlargest(10000, 'popularity')
        df_filtered.loc[core_shows.index, 'is_core'] = True
        core_count = 10000
    else:
        # If less than 20k shows, mark all as core
        df_filtered['is_core'] = True
        core_count = len(df_filtered)
    
    print(f"Marked {core_count:,} core TV shows (highest popularity)")
    
    # Prepare final dataframe
    df_final = df_filtered.copy()
    
    # Drop original string columns before renaming
    df_final = df_final.drop(columns=['genres', 'first_air_date_parsed'], errors='ignore')
    
    # Rename list columns to final names
    df_final = df_final.rename(columns={
        'id': 'show_id',
        'name': 'title',
        'genres_list': 'genres',
        'first_air_date': 'release_date'
    })
    
    # Add empty keywords column for compatibility with movie format
    df_final['keywords'] = [[] for _ in range(len(df_final))]
    
    # Reorder columns
    df_final = df_final[[
        'show_id',
        'title',
        'genres',
        'keywords',
        'overview',
        'vote_average',
        'vote_count',
        'popularity',
        'release_date',
        'original_language',
        'number_of_seasons',
        'number_of_episodes',
        'is_core'
    ]]
    
    # Save processed data
    print("\n[7/7] Saving processed dataset...")
    os.makedirs(os.path.dirname(PROCESSED_DATA_PATH), exist_ok=True)
    
    # Clean overview text - remove newlines and extra whitespace
    df_final['overview'] = df_final['overview'].apply(
        lambda x: ' '.join(str(x).split()) if pd.notna(x) else ''
    )
    
    # Save with proper CSV escaping (use quoting to handle commas and special chars)
    df_final.to_csv(PROCESSED_DATA_PATH, index=False, quoting=1)
    print(f" Saved to {PROCESSED_DATA_PATH}")
    
    # Final statistics
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total TV shows:         {len(df_final):,}")
    print(f"Core shows:             {core_count:,}")
    print(f"Non-core shows:         {len(df_final) - core_count:,}")
    print(f"\nAverage rating:         {df_final['vote_average'].mean():.2f}")
    print(f"Average votes:          {df_final['vote_count'].mean():.0f}")
    print(f"Average popularity:     {df_final['popularity'].mean():.2f}")
    
    print(f"\nShows with overview:    {(df_final['overview'].str.len() > 0).sum():,}")
    
    # Language breakdown
    print(f"\nTop languages:")
    lang_counts = df_final['original_language'].value_counts().head(5)
    for lang, count in lang_counts.items():
        print(f"  {lang}: {count:,}")
    
    # Genre breakdown for core shows
    print(f"\nTop genres in core shows:")
    all_genres = []
    for genres_list in df_final[df_final['is_core']]['genres']:
        all_genres.extend(genres_list)
    
    from collections import Counter
    genre_counts = Counter(all_genres).most_common(10)
    for genre, count in genre_counts:
        print(f"  {genre}: {count:,}")
    
    print("\n Normalization complete!")
    print("=" * 60)

def parse_genres(genres_str):
    """
    Parse genres from comma-separated string to Python list
    
    Input: 'Drama, Comedy, Action & Adventure'
    Output: ['Drama', 'Comedy', 'Action & Adventure']
    """
    if pd.isna(genres_str):
        return []
    
    if genres_str == '' or genres_str == '[]':
        return []
    
    # Handle comma-separated format
    if isinstance(genres_str, str):
        genres = [g.strip() for g in genres_str.split(',') if g.strip()]
        return genres
    
    return []

def parse_keywords(keywords_str):
    """
    Parse keywords from comma-separated string to Python list
    
    Input: 'detective, crime, investigation, murder'
    Output: ['detective', 'crime', 'investigation', 'murder']
    
    Limits to top 15 keywords per show to avoid feature explosion
    """
    if pd.isna(keywords_str):
        return []
    
    if keywords_str == '' or keywords_str == '[]':
        return []
    
    # Handle comma-separated format
    if isinstance(keywords_str, str):
        keywords = [k.strip() for k in keywords_str.split(',') if k.strip()]
        return keywords[:15]  # Limit to avoid too many features
    
    return []

if __name__ == "__main__":
    main()
