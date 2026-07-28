import os

from supabase import create_client

# Environment variables are loaded once in config.py.
# No need to call load_dotenv() here.

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

print("Supabase connected")
