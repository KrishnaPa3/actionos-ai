"""
Supabase Admin client.

Uses the SERVICE_ROLE_KEY for administrative operations that bypass
Row Level Security. This client should NEVER be used for regular
database operations — only for privileged actions such as deleting
users from auth.users.

Do NOT replace the existing supabase_client — keep them separate.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_admin = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

