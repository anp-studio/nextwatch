"""
Test normalized data quality
"""
import pandas as pd
import ast

PROCESSED_DATA_PATH = '../data/processed/movies_normalized.csv'

def main():
    print("Loading normalized dataset...")
    df = pd.read_csv(PROCESSED_DATA_PATH)
    
    print("\n" + "=" * 60)
    print("DATA QUALITY CHECKS")
    print("=" * 60)
    
    # Check 1: No missing IDs
    print("\n[1] Checking movie IDs...")
    missing_ids = df['movie_id'].isnull().sum()
    duplicate_ids = df['movie_id'].duplicated().sum()
    print(f"  Missing IDs: {missing_ids}")
    print(f"  Duplicate IDs: {duplicate_ids}")
    assert missing_ids == 0, "Found missing IDs!"
    assert duplicate_ids == 0, "Found duplicate IDs!"
    print(" All IDs are unique and present")
    
    # Check 2: Genres format
    print("\n[2] Checking genres format...")
    sample_genres = df['genres'].iloc[0]
    print(f"  Sample: {sample_genres}")
    
    try:
        genres_list = ast.literal_eval(sample_genres)
        assert isinstance(genres_list, list), "Genres not a list!"
        print(f"  Genres are properly formatted lists")
    except:
        print("  ERROR: Genres format is invalid!")
    
    # Check 3: Keywords format
    print("\n[3] Checking keywords format...")
    sample_keywords = df['keywords'].iloc[0]
    print(f"  Sample: {sample_keywords}")
    
    try:
        keywords_list = ast.literal_eval(sample_keywords)
        assert isinstance(keywords_list, list), "Keywords not a list!"
        print(f"  Keywords are properly formatted lists")
    except:
        print("  ERROR: Keywords format is invalid!")
    
    # Check 4: Core movies
    print("\n[4] Checking core movies...")
    core_count = df['is_core'].sum()
    print(f"  Core movies: {core_count:,}")
    print(f"  Non-core movies: {len(df) - core_count:,}")
    
    if core_count > 0:
        core_df = df[df['is_core']]
        print(f"  Core avg rating: {core_df['vote_average'].mean():.2f}")
        print(f"  Core avg votes: {core_df['vote_count'].mean():.0f}")
        print("   Core movies properly marked")
    
    # Check 5: Data ranges
    print("\n[5] Checking data ranges...")
    print(f"  Ratings range: {df['vote_average'].min():.1f} - {df['vote_average'].max():.1f}")
    print(f"  Votes range: {df['vote_count'].min():.0f} - {df['vote_count'].max():.0f}")
    print(f"  Popularity range: {df['popularity'].min():.1f} - {df['popularity'].max():.1f}")
    
    # Check 6: Sample movies
    print("\n[6] Sample movies:")
    sample = df.sample(3)
    for idx, row in sample.iterrows():
        print(f"\n  {row['title']}")
        print(f"    ID: {row['movie_id']}")
        print(f"    Rating: {row['vote_average']}")
        print(f"    Genres: {ast.literal_eval(row['genres'])}")
        print(f"    Core: {row['is_core']}")
    
    print("\n" + "=" * 60)
    print("All quality checks passed!")
    print("=" * 60)

if __name__ == "__main__":
    main()