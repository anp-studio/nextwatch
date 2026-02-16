import subprocess
import os
import sys

def run_script(script_path):
  """Run a python script in its own directory."""
  script_abs_path = os.path.abspath(script_path)
  script_dir = os.path.dirname(script_abs_path)
  script_name = os.path.basename(script_abs_path)
  
  print(f"\n" + "="*50)
  print(f"RUNNING: {script_name}")
  print(f"DIRECTORY: {script_dir}")
  print("="*50 + "\n")
  
  try:
    subprocess.run([sys.executable, script_name], cwd=script_dir, check=True)
    print(f"\n[SUCCESS] Finished {script_name}")
  except subprocess.CalledProcessError as e:
    print(f"\n[ERROR] {script_name} failed with exit code {e.returncode}")
    return False
  except Exception as e:
    print(f"\n[ERROR] An unexpected error occurred: {e}")
    return False
  return True

def main():
  # Get the directory of this script
  current_dir = os.path.dirname(os.path.abspath(__file__))
  
  # Define scripts to run relative to this script's location
  scripts = [
    os.path.join(current_dir, "movies", "1_normalize_movie_dataset.py"),
    os.path.join(current_dir, "TV shows", "1_normalize_shows_dataset.py")
  ]
  
  results = []
  for script in scripts:
    if os.path.exists(script):
      success = run_script(script)
      results.append((os.path.basename(script), success))
    else:
      print(f"\n[WARNING] Script not found: {script}")
      results.append((os.path.basename(script), "NOT FOUND"))

  print("\n" + "="*50)
  print("SUMMARY")
  print("="*50)
  for name, status in results:
    status_str = "PASSED" if status is True else "FAILED" if status is False else status
    print(f"{name:.<40} {status_str}")
  print("="*50)

if __name__ == "__main__":
  main()
