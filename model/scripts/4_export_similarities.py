import gzip
import json
import pandas as pd
import os
from pathlib import Path

def export_similarities_compressed():
  print("Exporting similarities...")

  data_dir = Path(__file__).parent.parent / "data" / "processed"
  similarity_file = data_dir / "similarity_matrix_optimized.csv"
  output_file = data_dir / "similarity_matrix_optimized.csv.gz"
  
  if not similarity_file.exists():
    print(f"Error: {similarity_file} not found")
    return
  
  print(f"Reading similarity matrix from {similarity_file}")

  try:
    with open(similarity_file, 'rb') as f_in:
      with gzip.open(output_file, 'wb') as f_out:
        f_out.writelines(f_in)
    
    original_size = os.path.getsize(similarity_file)
    compressed_size = os.path.getsize(output_file)
    compression_ratio = (1 - compressed_size / original_size) * 100
    
    print(f"Successfully compressed similarity matrix")
    print(f"Original size: {original_size / 1024 / 1024:.2f} MB")
    print(f"Compressed size: {compressed_size / 1024 / 1024:.2f} MB")
    print(f"Compression ratio: {compression_ratio:.1f}%")
    print(f"Saved to: {output_file}")
    
  except Exception as e:
    print(f"Error compressing similarity matrix: {e}")

if __name__ == "__main__":
  export_similarities_compressed()