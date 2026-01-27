"""Quick test of recommendations for key movies"""
import pandas as pd

# Load data
print("Loading data...")
sim_df = pd.read_csv('../data/processed/similarity_matrix.csv')
movies_meta = pd.read_csv('../data/processed/movies_core.csv')
shows_meta = pd.read_csv('../data/processed/shows_normalized.csv')

# Sync column names
if 'movie_id' in movies_meta.columns:
  movies_meta = movies_meta.rename(columns={'movie_id': 'id'})
if 'show_id' in shows_meta.columns:
  shows_meta = shows_meta.rename(columns={'show_id': 'id'})

# Ensure internal consistency for tests
if 'vote_average' in shows_meta.columns:
  shows_meta = shows_meta.rename(columns={'vote_average': 'imdb_rating', 'vote_count': 'imdb_votes'})

# Add type flag to metadata 
movies_meta['type'] = 'movie'
shows_meta['type'] = 'show'

all_meta = pd.concat([movies_meta, shows_meta], ignore_index=True)

# Test cases
test_cases = [
  ("m_19995", "Avatar"),
  ("m_238", "The Godfather"),
  ("m_27205", "Inception"),
  ("m_157336", "Interstellar"),
  ("m_24428", "The Avengers"),
  ("s_75006", "The Umbrella Academy"),
  ("s_1399", "Game of Thrones")
]

def get_item_info(item_id):
    matches = []
    
    # Check if movie or show based on prefix
    is_movie = str(item_id).startswith('m_')
    raw_id = int(str(item_id).split('_')[1])
    
    if is_movie:
        m = movies_meta[movies_meta['id'] == raw_id]
        if not m.empty:
            row = m.iloc[0]
            matches.append({
                'title': row['title'],
                'type': 'Movie',
                'rating': row['imdb_rating'],
                'votes': row['imdb_votes'],
                'pop': row['popularity'],
                'budget': row['budget'] if 'budget' in row else 0
            })
    else:
        s = shows_meta[shows_meta['id'] == raw_id]
        if not s.empty:
            row = s.iloc[0]
            matches.append({
                'title': row['title'],
                'type': 'Show', 
                'rating': row['imdb_rating'],
                'votes': row['imdb_votes'],
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
    sim_id = row['similar_id']
    sim_type = row['similar_type']
    score = row['similarity_score']
    
    # Extract raw ID for lookup
    raw_sim_id = int(str(sim_id).split('_')[1])
    
    # Lookup info only for title and other metadata
    meta_src = movies_meta if sim_type == 'movie' else shows_meta
    m = meta_src[meta_src['id'] == raw_sim_id]
    
    if m.empty:
        print(f"{i+1:2d}. [ID {sim_id} ({sim_type}) NOT FOUND IN METADATA]")
        continue
        
    row_m = m.iloc[0]
    budget = row_m['budget'] if 'budget' in row_m else 0
    budget_str = f"${budget/1e6:.0f}M" if budget > 0 else "N/A"
    
    print(f"{i+1:2d}. {row_m['title'][:35]:35s} | {sim_type.capitalize():5s} | Score: {score:.3f} | Rating: {row_m['imdb_rating']:.1f} ({int(row_m['imdb_votes'])}) | Pop: {row_m['popularity']:.0f} | Budget: {budget_str}")

print("\n" + "=" * 80)
print("DONE!")
