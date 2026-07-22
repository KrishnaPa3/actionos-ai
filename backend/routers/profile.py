"""
Profile endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies.database import AuthContext, get_auth_context
from schemas.profile import (
    ProfileEmailUpdate,
    ProfilePasswordUpdate,
    ProfileResponse,
    ProfileUpdate,
)
from auth_supabase import get_authenticated_supabase
from supabase_client import supabase

router = APIRouter()


def _build_profile_response(
    profile_row: dict | None,
    auth_user: dict,
) -> ProfileResponse:
    """Combine profiles table row with Supabase Auth user data."""
    return ProfileResponse(
        id=auth_user["id"],
        username=(profile_row or {}).get("username"),
        full_name=(profile_row or {}).get("full_name"),
        avatar_url=(profile_row or {}).get("avatar_url"),
        email=auth_user.get("email"),
        created_at=_pick_timestamp(
            (profile_row or {}).get("created_at"),
            auth_user.get("created_at"),
        ),
        last_sign_in=auth_user.get("last_sign_in_at") or auth_user.get("last_sign_in"),
        provider=_extract_provider(auth_user),
    )


def _pick_timestamp(*candidates: str | None) -> str | None:
    """Return the first non-None timestamp from candidates."""
    for c in candidates:
        if c:
            return c
    return None


def _extract_provider(auth_user: dict) -> str | None:
    """Extract the auth provider from the user object."""
    app_metadata = auth_user.get("app_metadata", {}) or {}
    identities = auth_user.get("identities", []) or []
    if app_metadata.get("provider"):
        return app_metadata["provider"]
    if identities:
        return identities[0].get("provider", "email")
    return "email"


def _get_or_create_profile(db, user_id: str, auth_user: dict) -> dict | None:
    """Fetch the profile row; create one if missing."""
    result = db.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    profile = result.data if result else None

    if profile is None:
        meta = auth_user.get("user_metadata", {}) or {}
        now = datetime.now(timezone.utc).isoformat()
        insert_data = {
            "id": user_id,
            "username": meta.get("username") or auth_user.get("email", "").split("@")[0],
            "full_name": meta.get("full_name") or "",
            "avatar_url": None,
            "created_at": now,
            "updated_at": now,
        }
        try:
            db.table("profiles").insert(insert_data).execute()
            profile = insert_data
        except Exception as e:
            print(f"[PROFILE] Failed to auto-create profile: {e}")

    return profile


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(ctx: AuthContext = Depends(get_auth_context)):
    """
    Return the authenticated user's combined profile
    (profiles table + Supabase Auth user info).
    """
    profile = _get_or_create_profile(ctx.db, ctx.user_id, ctx.user)

    # Fetch full auth user details (includes last_sign_in, provider, etc.)
    try:
        auth_response = supabase.auth.get_user(ctx.access_token)
        auth_user = auth_response.user
        auth_dict = {
            "id": auth_user.id,
            "email": auth_user.email,
            "created_at": str(auth_user.created_at) if auth_user.created_at else None,
            "last_sign_in_at": str(auth_user.last_sign_in_at) if auth_user.last_sign_in_at else None,
            "app_metadata": auth_user.app_metadata or {},
            "identities": (
                [{"provider": i.provider} for i in (auth_user.identities or [])]
                if hasattr(auth_user, "identities")
                else []
            ),
            "user_metadata": auth_user.user_metadata or {},
        }
    except Exception as e:
        print(f"[PROFILE] Failed to fetch auth user details: {e}")
        auth_dict = ctx.user

    return _build_profile_response(profile, auth_dict)


@router.post("/profile/setup", response_model=dict)
async def setup_profile(ctx: AuthContext = Depends(get_auth_context)):
    """
    Explicitly create a profile row for the authenticated user.
    Idempotent — does nothing if profile already exists.
    """
    result = ctx.db.table("profiles").select("id").eq("id", ctx.user_id).maybe_single().execute()
    existing_profile = result.data if result else None
    if existing_profile:
        return {"success": True, "message": "Profile already exists"}

    meta = ctx.user.get("user_metadata", {}) or {}
    now = datetime.now(timezone.utc).isoformat()
    insert_data = {
        "id": ctx.user_id,
        "username": meta.get("username") or ctx.user.get("email", "").split("@")[0],
        "full_name": meta.get("full_name") or "",
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    }
    ctx.db.table("profiles").insert(insert_data).execute()

    return {"success": True, "message": "Profile created successfully"}


@router.patch("/profile", response_model=dict)
async def update_profile(
    data: ProfileUpdate,
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update username and/or full_name on the profiles table."""
    update_fields = {}

    if data.username is not None:
        username = data.username.strip()
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty.",
            )
        # Check uniqueness
        existing = (
            ctx.db.table("profiles")
            .select("id")
            .eq("username", username)
            .neq("id", ctx.user_id)
            .maybe_single()
            .execute()
        )
        if existing and existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken.",
            )
        update_fields["username"] = username

    if data.full_name is not None:
        update_fields["full_name"] = data.full_name.strip()

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    ctx.db.table("profiles").update(update_fields).eq("id", ctx.user_id).execute()

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "updated_fields": list(update_fields.keys()),
    }


@router.patch("/profile/email", response_model=dict)
async def update_email(
    data: ProfileEmailUpdate,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Update email through Supabase Auth (auth.users).
    Does NOT write to public.profiles — auth data belongs to auth.users.
    Returns a confirmation message if email confirmation is enabled.
    """
    try:
        email = data.email.strip().lower()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email cannot be empty.",
            )

        # Use the authenticated client (user's own session) for auth operations
        auth_db = get_authenticated_supabase(ctx.access_token)
        auth_db.auth.update_user({"email": email})

        return {
            "success": True,
            "message": "A confirmation email has been sent to your new email address. Please check your inbox and follow the instructions to confirm the change.",
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        print(f"[PROFILE] Email update failed: {e}")

        if "already in use" in error_msg or "email already exists" in error_msg:
            detail = "This email address is already associated with another account."
        elif "invalid" in error_msg and "email" in error_msg:
            detail = "Please enter a valid email address."
        elif "expired" in error_msg or "session" in error_msg:
            detail = "Your session has expired. Please log in again."
        else:
            detail = str(e) or "Failed to update email. Please try again."

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


@router.patch("/profile/password", response_model=dict)
async def update_password(
    data: ProfilePasswordUpdate,
    ctx: AuthContext = Depends(get_auth_context),
):
    """
    Update password through Supabase Auth.
    Passwords are NEVER stored in our database.
    """
    try:
        # Use the authenticated client (user's own session) for auth operations
        auth_db = get_authenticated_supabase(ctx.access_token)
        auth_db.auth.update_user({"password": data.password})
        return {
            "success": True,
            "message": "Password updated successfully.",
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        print(f"[PROFILE] Password update failed: {e}")

        if "weak" in error_msg or "too weak" in error_msg or "password" in error_msg and "strength" in error_msg:
            detail = "Password is too weak. Use at least 6 characters with a mix of letters, numbers, and symbols."
        elif "expired" in error_msg or "session" in error_msg:
            detail = "Your session has expired. Please log in again."
        elif "invalid" in error_msg or "credentials" in error_msg:
            detail = "Authentication failed. Please log in again and try again."
        else:
            detail = str(e) or "Failed to update password. Please try again."

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )
