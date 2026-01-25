"""Quick test of recommendations for key movies"""
import pandas as pd

# Load data
print("Loading data...")
sim_df = pd.read_csv('../data/processed/similarity_matrix.csv')
movies_meta = pd.read_csv('../data/processed/movies_normalized.csv')
shows_meta = pd.read_csv('../data/processed/shows_normalized.csv')

# Rename columns
if 'movie_id' in movies_meta.columns:
  movies_meta = movies_meta.rename(columns={'movie_id': 'id'})
if 'show_id' in shows_meta.columns:
  shows_meta = shows_meta.rename(columns={'show_id': 'id'})

# Add type flag to metadata 
movies_meta['type'] = 'movie'
shows_meta['type'] = 'show'

all_meta = pd.concat([movies_meta, shows_meta], ignore_index=True)

# Test cases
test_cases = [
  (19995, "Avatar"),
  (238, "The Godfather"),
  (27205, "Inception"),
  (157336, "Interstellar"),
  (24428, "The Avengers"),
  (75006, "The Umbrella Academy"),
  (1399, "Game of Thrones")
]

def get_item_info(item_id):
    """Find item info, handling ID collisions by checking both tables"""
    # Return list of matches because of collision
    matches = []
    
    # Check movies
    m = movies_meta[movies_meta['id'] == item_id]
    if not m.empty:
        row = m.iloc[0]
        matches.append({
            'title': row['title'],
            'type': 'Movie',
            'rating': row['vote_average'],
            'votes': row['vote_count'],
            'pop': row['popularity'],
            'budget': row['budget'] if 'budget' in row else 0
        })
        
    # Check shows
    s = shows_meta[shows_meta['id'] == item_id]
    if not s.empty:
        row = s.iloc[0]
        matches.append({
            'title': row['title'], # 'name' in raw, 'title' in normalized
            'type': 'Show', 
            'rating': row['vote_average'],
            'votes': row['vote_count'],
            'pop': row['popularity'],
            'budget': 0
        })
    
    return matches

for movie_id, movie_name in test_cases:
  print("\n" + "=" * 80)
  print(f"TOP 10 RECOMMENDATIONS FOR: {movie_name} (ID: {movie_id})")
  print("=" * 80)
  
  # Get similarities
  sims = sim_df[sim_df['id'] == movie_id].head(10)
  
  # Display
  for i, (_, row) in enumerate(sims.iterrows()):
    sim_id = int(row['similar_id'])
    score = row['similarity_score']
    
    # Lookup info
    infos = get_item_info(sim_id)
    
    if not infos:
        print(f"{i+1:2d}. [ID {sim_id} NOT FOUND IN METADATA]")
        continue
        
    # Valid output
    for info in infos:
        budget_str = f"${info['budget']/1e6:.0f}M" if info['budget'] > 0 else "N/A"
        print(f"{i+1:2d}. {info['title'][:35]:35s} | {info['type']:5s} | Score: {score:.3f} | Rating: {info['rating']:.1f} ({int(info['votes'])}) | Pop: {info['pop']:.0f} | Budget: {budget_str}")

print("\n" + "=" * 80)
print("DONE!")
