#!/usr/bin/env python3
"""
Test the normalized TV shows dataset
"""
import pandas as pd
import ast

# Load normalized dataset
PROCESSED_DATA_PATH = '../../data/processed/shows_normalized.csv'

print("=" * 70)
print("Testing Normalized TV Shows Dataset")
print("=" * 70)

df = pd.read_csv(PROCESSED_DATA_PATH)

print(f"\n[1] Basic Info")
print(f"Total TV shows: {len(df):,}")
print(f"Core shows: {df['is_core'].sum():,}")
print(f"Non-core shows: {(~df['is_core']).sum():,}")

print(f"\n[2] Data Quality")
print(f"Shows with overview: {(df['overview'].str.len() > 0).sum():,} ({(df['overview'].str.len() > 0).sum() / len(df) * 100:.1f}%)")

# Parse genres and keywords
df['genres_parsed'] = df['genres'].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') else [])
df['keywords_parsed'] = df['keywords'].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') else [])

print(f"Shows with genres: {(df['genres_parsed'].apply(len) > 0).sum():,} ({(df['genres_parsed'].apply(len) > 0).sum() / len(df) * 100:.1f}%)")
print(f"Shows with keywords: {(df['keywords_parsed'].apply(len) > 0).sum():,} ({(df['keywords_parsed'].apply(len) > 0).sum() / len(df) * 100:.1f}%)")

print(f"\n[3] Rating Statistics")
print(f"Average rating: {df['vote_average'].mean():.2f}")
print(f"Average votes: {df['vote_count'].mean():.0f}")
print(f"Average popularity: {df['popularity'].mean():.2f}")

print(f"\n[4] Core Shows Statistics")
core_df = df[df['is_core']]
print(f"Core average rating: {core_df['vote_average'].mean():.2f}")
print(f"Core average votes: {core_df['vote_count'].mean():.0f}")
print(f"Core average popularity: {core_df['popularity'].mean():.2f}")
print(f"Core popularity range: {core_df['popularity'].min():.2f} - {core_df['popularity'].max():.2f}")

print(f"\n[5] Sample Core Shows (Top 10 by Popularity)")
print("-" * 70)
top_shows = core_df.nlargest(10, 'popularity')[['title', 'vote_average', 'vote_count', 'popularity', 'release_date']]
for idx, row in top_shows.iterrows():
    print(f"{row['title']:<40} | Rating: {row['vote_average']:.1f} | Votes: {row['vote_count']:>6} | Pop: {row['popularity']:>7.2f}")

print(f"\n[6] Sample Shows with Keywords (First 5)")
print("-" * 70)
shows_with_keywords = df[df['keywords_parsed'].apply(len) > 0].head(5)
for idx, row in shows_with_keywords.iterrows():
    keywords = row['keywords_parsed'][:5]  # Show first 5 keywords
    print(f"\n{row['title']}")
    print(f"  Genres: {', '.join(row['genres_parsed'])}")
    print(f"  Keywords: {', '.join(keywords)}")
    print(f"  Rating: {row['vote_average']:.1f} | Votes: {row['vote_count']} | Popularity: {row['popularity']:.2f}")

print(f"\n[7] Language Distribution")
print("-" * 70)
lang_counts = df['original_language'].value_counts().head(10)
for lang, count in lang_counts.items():
    percentage = count / len(df) * 100
    print(f"{lang}: {count:>6,} ({percentage:>5.1f}%)")

print(f"\n[8] Genre Distribution (Core Shows)")
print("-" * 70)
all_genres = []
for genres_list in core_df['genres_parsed']:
    all_genres.extend(genres_list)

from collections import Counter
genre_counts = Counter(all_genres).most_common(15)
for genre, count in genre_counts:
    percentage = count / len(core_df) * 100
    print(f"{genre:<30} {count:>5,} ({percentage:>5.1f}%)")

print("\n" + "=" * 70)
print("Test Complete!")
print("=" * 70)
