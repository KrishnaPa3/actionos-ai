from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from supabase_client import supabase

security = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        # Validate JWT with Supabase
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            )

        return {
            "id": user.id,
            "email": user.email,
            "role": getattr(user, "role", "authenticated"),
            "access_token": credentials.credentials,
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"[AUTH ERROR] {e}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )