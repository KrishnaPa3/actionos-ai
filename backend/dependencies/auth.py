from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase_client import supabase

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    print("=" * 60)
    print("AUTH DEPENDENCY CALLED")

    if credentials:
        print("Scheme:", credentials.scheme)
        print("Token (first 40 chars):", credentials.credentials[:40])
    else:
        print("No credentials received!")

    try:
        response = supabase.auth.get_user(credentials.credentials)

        print("Supabase response:", response)

        user = response.user
        print("User:", user)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )

        return {
            "id": user.id,
            "email": user.email,
            "role": getattr(user, "role", "authenticated"),
             "access_token": credentials.credentials,
        }

    except Exception as e:
        print("AUTH ERROR:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )