#!/usr/bin/env python3
"""
Normalize Kaggle TMDB dataset - Extract only what's needed for ML
"""
import pandas as pd
import json
import os
from datetime import datetime

# Paths
RAW_DATA_PATH = '../data/raw/TMDB_movie_dataset_v11.csv'
PROCESSED_DATA_PATH = '../data/processed/movies_normalized.csv'

def main():
    print("=" * 60)
    print("TMDB Dataset Normalization")
    print("=" * 60)
    
    # Load dataset
    print("\n[1/7] Loading dataset...")
    df = pd.read_csv(RAW_DATA_PATH)
    print(f"Loaded {len(df):,} movies")
    print(f"Columns: {len(df.columns)}")
    
    # Select needed columns
    print("\n[2/7] Selecting needed columns...")
    needed_columns = [
        'id',
        'title',
        'genres',
        'keywords',
        'overview',
        'vote_average',
        'vote_count',
        'popularity',
        'release_date',
        'original_language'
    ]
    
    df = df[needed_columns].copy()
    print(f"Reduced to {len(df.columns)} columns")
    
    # Basic cleaning
    print("\n[3/7] Cleaning data...")
    
    # Remove rows without title
    df = df[df['title'].notna()].copy()
    
    # Remove rows without ID
    df = df[df['id'].notna()].copy()
    df['id'] = df['id'].astype(int)
    
    # Fill missing values
    df['overview'] = df['overview'].fillna('')
    df['vote_average'] = df['vote_average'].fillna(0)
    df['vote_count'] = df['vote_count'].fillna(0)
    df['popularity'] = df['popularity'].fillna(0)
    df['original_language'] = df['original_language'].fillna('en')
    
    print(f"Cleaned to {len(df):,} movies")
    
    # Parse JSON fields
    print("\n[4/7] Parsing genres and keywords...")
    df['genres_list'] = df['genres'].apply(parse_genres)
    df['keywords_list'] = df['keywords'].apply(parse_keywords)
    
    # Statistics before filtering
    movies_with_genres = (df['genres_list'].apply(len) > 0).sum()
    movies_with_keywords = (df['keywords_list'].apply(len) > 0).sum()
    print(f"Movies with genres: {movies_with_genres:,}")
    print(f"Movies with keywords: {movies_with_keywords:,}")
    
    # Filter movies
    print("\n[5/7] Filtering quality movies...")
    # Criteria:
    # - (At least 10 votes AND has rating > 0) OR (Popularity >= 10)
    # - Has at least 1 genre
    # - Already released (not future releases)
    # This includes both established movies with votes and new/upcoming popular movies
    
    # Parse release dates and filter out future releases
    df['release_date_parsed'] = pd.to_datetime(df['release_date'], errors='coerce')
    today = pd.Timestamp.now()
    
    df_filtered = df[
        (
            ((df['vote_count'] >= 10) & (df['vote_average'] > 0)) |  # Established movies
            (df['popularity'] >= 10)  # Popular movies (even without votes yet)
        ) &
        (df['genres_list'].apply(len) > 0) &  # Must have genres
        ((df['release_date_parsed'].isna()) | (df['release_date_parsed'] <= today))  # Only released movies
    ].copy()
    
    print(f"✓ Filtered to {len(df_filtered):,} quality movies")
    
    # Mark movies for similarity computation
    print("\n[6/7] Selecting core movies for similarity computation...")
    # "Core movie criteria:
    # - At least 50 votes
    # - Rating >= 5.5
    # - Popularity >= 5
    # - Top 20,000 by popularity
    
    df_filtered['is_core'] = False
    
    core_candidates = df_filtered[
        (df_filtered['vote_count'] >= 50) &
        (df_filtered['vote_average'] >= 5.5) &
        (df_filtered['popularity'] >= 5)
    ]
    
    # Select top 20k by popularity
    core_movies = core_candidates.nlargest(20000, 'popularity')
    df_filtered.loc[core_movies.index, 'is_core'] = True
    
    core_count = df_filtered['is_core'].sum()
    print(f"✓ Marked {core_count:,} core movies")
    
    # Prepare final dataframe with renamed columns
    df_final = df_filtered.copy()
    
    # Drop original string columns before renaming
    df_final = df_final.drop(columns=['genres', 'keywords'], errors='ignore')
    
    # Rename list columns to final names
    df_final = df_final.rename(columns={
        'id': 'movie_id',
        'genres_list': 'genres',
        'keywords_list': 'keywords'
    })
    
    # Reorder columns
    df_final = df_final[[
        'movie_id',
        'title',
        'genres',
        'keywords',
        'overview',
        'vote_average',
        'vote_count',
        'popularity',
        'release_date',
        'original_language',
        'is_core'
    ]]
    
    # Save processed data
    print("\n[7/7] Saving processed dataset...")
    os.makedirs(os.path.dirname(PROCESSED_DATA_PATH), exist_ok=True)
    df_final.to_csv(PROCESSED_DATA_PATH, index=False)
    print(f"✓ Saved to {PROCESSED_DATA_PATH}")
    
    # Final statistics
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total movies:           {len(df_final):,}")
    print(f"Core movies:            {core_count:,}")
    print(f"Non-core movies:        {len(df_final) - core_count:,}")
    print(f"\nAverage rating:         {df_final['vote_average'].mean():.2f}")
    print(f"Average votes:          {df_final['vote_count'].mean():.0f}")
    print(f"Average popularity:     {df_final['popularity'].mean():.2f}")
    
    print(f"\nMovies with keywords:   {(df_final['keywords'].apply(len) > 0).sum():,}")
    print(f"Movies with overview:   {(df_final['overview'].str.len() > 0).sum():,}")
    
    # Language breakdown
    print(f"\nTop languages:")
    lang_counts = df_final['original_language'].value_counts().head(5)
    for lang, count in lang_counts.items():
        print(f"  {lang}: {count:,}")
    
    # Genre breakdown for core movies
    print(f"\nTop genres in core movies:")
    all_genres = []
    for genres_list in df_final[df_final['is_core']]['genres']:
        all_genres.extend(genres_list)
    
    from collections import Counter
    genre_counts = Counter(all_genres).most_common(10)
    for genre, count in genre_counts:
        print(f"  {genre}: {count:,}")
    
    print("\n✅ Normalization complete!")
    print("=" * 60)

def parse_genres(genres_str):
    """
    Parse genres from comma-separated string to Python list
    
    Input: 'Action, Science Fiction, Adventure'
    Output: ['Action', 'Science Fiction', 'Adventure']
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
    
    Input: 'space, alien, future, technology'
    Output: ['space', 'alien', 'future', 'technology']
    
    Limits to top 15 keywords per movie to avoid feature explosion
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