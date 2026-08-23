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
        # TEMPORARY DIAGNOSTIC LOGGING
        # This lets us see the actual error returned by Supabase
        # instead of hiding it behind the generic 401 response.
        print(f"[AUTH ERROR TYPE] {type(e).__name__}")
        print(f"[AUTH ERROR] {e}")
        print(f"[AUTH ERROR STATUS] {getattr(e, 'status', None)}")

        upstream_status = getattr(e, "status", None)

        if upstream_status in {400, 401, 403}:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            ) from e

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable. Please retry.",
        ) from e