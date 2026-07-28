import os

from supabase import Client, create_client

# Environment variables are loaded once in config.py.
# No need to call load_dotenv() here.

def get_authenticated_supabase(access_token: str) -> Client:
    client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY"),
    )

    # Authenticate PostgREST (database)
    client.postgrest.auth(access_token)

    return client