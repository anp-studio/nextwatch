"""
Test recommendation system by searching for a movie/show and displaying similar items

Usage:
  python 3_test_recommendations.py                    # Interactive mode
  python 3_test_recommendations.py "Avatar"           # Search for "Avatar"
  python 3_test_recommendations.py "Avatar" --auto    # Auto-select first match
"""
import sys
sys.path.append('..')

import pandas as pd
import numpy as np
import argparse

def load_data():
  """Load similarity matrix and content metadata"""
  print("Loading data...")
  
  # Load similarity matrix
  sim_df = pd.read_csv('../data/processed/similarity_matrix.csv')
  
  # Load movies and shows metadata
  movies_df = pd.read_csv('../data/processed/movies_core.csv')
  shows_df = pd.read_csv('../data/processed/shows_normalized.csv')
  
  # Rename columns for consistency
  if 'movie_id' in movies_df.columns:
    movies_df.rename(columns={'movie_id': 'id'}, inplace=True)
  if 'show_id' in shows_df.columns:
    shows_df.rename(columns={'show_id': 'id'}, inplace=True)
  
  # Ensure internal consistency
  if 'vote_average' in shows_df.columns:
    shows_df.rename(columns={'vote_average': 'imdb_rating', 'vote_count': 'imdb_votes'}, inplace=True)

  movies_df['type'] = 'movie'
  shows_df['type'] = 'show'
  
  # Combine metadata
  content_df = pd.concat([movies_df, shows_df], ignore_index=True)
  
  print(f"Loaded {len(sim_df):,} similarity pairs")
  print(f"Loaded {len(content_df):,} items metadata")
  
  return sim_df, content_df

def search_by_title(title, content_df):
  """Search for items by title (case-insensitive partial match)"""
  title_lower = title.lower()
  
  # Search in title column
  matches = content_df[
    content_df['title'].str.lower().str.contains(title_lower, na=False)
  ].copy()
  
  return matches

def get_recommendations(item_id, sim_df, content_df, top_n=20, min_rating=5.5):
  """Get top N recommendations for a given item ID with quality filtering"""
  
  # Get similar items for this ID
  recommendations = sim_df[sim_df['id'] == item_id].copy()
  
  if len(recommendations) == 0:
    return None
  
  # Merge with content metadata early to enable filtering
  recommendations = recommendations.merge(
    content_df[['id', 'title', 'type', 'imdb_rating', 'imdb_votes', 'release_date']],
    left_on='similar_id',
    right_on='id',
    how='left',
    suffixes=('', '_similar')
  )
  
  # Drop duplicate id column from merge
  recommendations = recommendations.drop(columns=['id_similar'])
  
  # QUALITY FILTER: Remove low-rated items (less than min_rating)
  # Also require minimum vote count to avoid obscure films with few votes
  recommendations = recommendations[
    (recommendations['imdb_rating'] >= min_rating) & 
    (recommendations['imdb_votes'] >= 100)
  ].copy()
  
  # Sort by similarity score (descending)
  recommendations = recommendations.sort_values('similarity_score', ascending=False)
  
  # Get top N after filtering
  recommendations = recommendations.head(top_n)
  
  return recommendations

def display_item_info(item, content_df):
  """Display information about a specific item"""
  print("\n" + "=" * 80)
  print(f"SELECTED ITEM")
  print("=" * 80)
  print(f"ID: {item['id']}")
  print(f"Title: {item['title']}")
  print(f"Type: {item['type'].upper()}")
  print(f"Year: {item['release_date'][:4] if pd.notna(item['release_date']) else 'N/A'}")
  print(f"Rating: {item['imdb_rating']:.1f}/10")
  if 'genres' in item and pd.notna(item['genres']):
    print(f"Genres: {item['genres']}")
  print("=" * 80)

def display_recommendations(recommendations):
  """Display recommendations in a nice format"""
  print("\n" + "=" * 80)
  print(f"TOP {len(recommendations)} SIMILAR ITEMS")
  print("=" * 80)
  
  for idx, row in recommendations.iterrows():
    year = row['release_date'][:4] if pd.notna(row['release_date']) else 'N/A'
    print(f"\n{idx+1}. {row['title']} ({year})")
    print(f"   Type: {row['type'].upper()} | Rating: {row['imdb_rating']:.1f}/10 | Similarity: {row['similarity_score']:.3f}")
  
  print("\n" + "=" * 80)

def main():
  # Parse command-line arguments
  parser = argparse.ArgumentParser(description='Test movie/show recommendation system')
  parser.add_argument('query', nargs='?', help='Movie or show title to search for')
  parser.add_argument('--auto', action='store_true', help='Automatically select first match')
  parser.add_argument('--top', type=int, default=20, help='Number of recommendations to show (default: 20)')
  parser.add_argument('--min-rating', type=float, default=5.5, help='Minimum rating filter (default: 5.5)')
  args = parser.parse_args()
  
  # Load data
  sim_df, content_df = load_data()
  
  # Non-interactive mode if query provided
  if args.query:
    search_query = args.query.strip()
    
    if not search_query:
      print("Error: Empty query provided!")
      return
    
    # Search for matches
    matches = search_by_title(search_query, content_df)
    
    if len(matches) == 0:
      print(f"No matches found for '{search_query}'")
      return
    
    # Display matches
    print(f"\nFound {len(matches)} match(es):")
    for i, (idx, item) in enumerate(matches.head(10).iterrows()):
      year = item['release_date'][:4] if pd.notna(item['release_date']) else 'N/A'
      print(f"{i+1}. {item['title']} ({year}) - {item['type'].upper()} - Rating: {item['imdb_rating']:.1f}/10")
    
    if len(matches) > 10:
      print(f"... and {len(matches) - 10} more")
    
    if args.auto or len(matches) == 1:
      selection = 0
      if len(matches) > 1:
        print(f"\nAuto-selecting: {matches.iloc[0]['title']}")
    else:
      try:
        selection_input = input(f"\nSelect item (1-{min(len(matches), 10)}): ").strip()
        selection = int(selection_input) - 1
        if selection < 0 or selection >= min(len(matches), 10):
          print("Invalid selection!")
          return
      except (ValueError, EOFError, KeyboardInterrupt):
        print("\nAborted.")
        return
    
    selected_item = matches.iloc[selection]
    
    # Display selected item
    display_item_info(selected_item, content_df)
    
    # Get recommendations
    recommendations = get_recommendations(
      selected_item['id'], 
      sim_df, 
      content_df, 
      top_n=args.top,
      min_rating=args.min_rating
    )
    
    if recommendations is None or len(recommendations) == 0:
      print("\nNo recommendations found for this item!")
      return
    
    # Display recommendations
    recommendations = recommendations.reset_index(drop=True)
    display_recommendations(recommendations)
    return
  
  # Interactive mode (original behavior)
  while True:
    print("\n" + "=" * 80)
    print("MOVIE/SHOW RECOMMENDATION SYSTEM")
    print("=" * 80)
    
    # Get user input
    try:
      search_query = input("\nEnter movie/show title (or 'quit' to exit): ").strip()
    except (EOFError, KeyboardInterrupt):
      print("\nGoodbye!")
      break
    
    if search_query.lower() in ['quit', 'exit', 'q']:
      print("Goodbye!")
      break
    
    if not search_query:
      print("Please enter a valid title!")
      continue
    
    # Search for matches
    matches = search_by_title(search_query, content_df)
    
    if len(matches) == 0:
      print(f"\nNo matches found for '{search_query}'")
      continue
    
    # Display matches
    print(f"\nFound {len(matches)} match(es):")
    for i, (idx, item) in enumerate(matches.head(10).iterrows()):
      year = item['release_date'][:4] if pd.notna(item['release_date']) else 'N/A'
      print(f"{i+1}. {item['title']} ({year}) - {item['type'].upper()} - Rating: {item['imdb_rating']:.1f}/10")
    
    if len(matches) > 10:
      print(f"... and {len(matches) - 10} more")
    
    # Let user select
    if len(matches) == 1:
      selection = 0
    else:
      try:
        selection_input = input(f"\nSelect item (1-{min(len(matches), 10)}): ").strip()
        selection = int(selection_input) - 1
        if selection < 0 or selection >= min(len(matches), 10):
          print("Invalid selection!")
          continue
      except (ValueError, EOFError, KeyboardInterrupt):
        print("\nAborted.")
        break
    
    selected_item = matches.iloc[selection]
    
    # Display selected item
    display_item_info(selected_item, content_df)
    
    # Get recommendations
    recommendations = get_recommendations(
      selected_item['id'], 
      sim_df, 
      content_df, 
      top_n=20
    )
    
    if recommendations is None or len(recommendations) == 0:
      print("\nNo recommendations found for this item!")
      continue
    
    # Display recommendations
    recommendations = recommendations.reset_index(drop=True)
    display_recommendations(recommendations)

if __name__ == "__main__":
  main()
