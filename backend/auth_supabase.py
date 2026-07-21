import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

def get_authenticated_supabase(access_token: str) -> Client:
    client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY"),
    )

    # Authenticate PostgREST (database)
    client.postgrest.auth(access_token)

    return client