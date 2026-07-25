"""
Diagnostic script to test Supabase auth connectivity.
Identifies the source of the getaddrinfo failure.
"""
import os
import sys
import socket
import traceback

# Load .env manually
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL", "NOT SET")
key = os.getenv("SUPABASE_KEY", "NOT SET")
jwt = os.getenv("SUPABASE_JWT_SECRET", "NOT SET")

print("=" * 60)
print("SUPABASE CONFIGURATION CHECK")
print("=" * 60)
print(f"SUPABASE_URL: {url}")
print(f"SUPABASE_KEY: {key[:20]}...{key[-10:] if len(key) > 30 else ''}")
print(f"JWT_SECRET:   {jwt[:20]}...{jwt[-10:] if len(jwt) > 30 else ''}")

# Step 1: Test DNS resolution
print("\n" + "=" * 60)
print("STEP 1: DNS RESOLUTION TEST")
print("=" * 60)
try:
    hostname = url.replace("https://", "").split("/")[0]
    print(f"Resolving hostname: {hostname}")
    result = socket.getaddrinfo(hostname, 443)
    ips = set()
    for res in result:
        ips.add(res[4][0])
    print(f"✅ DNS resolution succeeded: {', '.join(ips)}")
except Exception as e:
    print(f"❌ DNS resolution FAILED: {e}")
    print(f"   This is likely the [Errno 11002] getaddrinfo failed error!")
    print(f"   This is a network/system DNS issue, not a code issue.")

# Step 2: Test supabase client creation
print("\n" + "=" * 60)
print("STEP 2: SUPABASE CLIENT CREATION")
print("=" * 60)
try:
    from supabase_client import supabase
    print(f"✅ supabase_client imported successfully")
    print(f"   supabase_url: {supabase.supabase_url}")
except Exception as e:
    print(f"❌ supabase_client import FAILED: {e}")
    traceback.print_exc()

# Step 3: Test auth.get_user with a dummy token
print("\n" + "=" * 60)
print("STEP 3: AUTH.GET_USER TEST (will fail on purpose)")
print("=" * 60)
try:
    from supabase import create_client
    
    # Create a fresh client directly
    test_client = create_client(url, key)
    print(f"✅ Direct client creation succeeded")
    
    # Try to call get_user with an invalid token
    # This is where the actual error occurs in production
    try:
        result = test_client.auth.get_user("invalid_token_xyz")
        print(f"⚠️  get_user returned (unexpected): {result}")
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"❌ get_user FAILED:")
        print(f"   Error type: {error_type}")
        print(f"   Error msg:  {error_msg}")
        
        # Check if it's a network error
        if "getaddrinfo" in error_msg or "Errno 11002" in error_msg or "Name or service not known" in error_msg:
            print(f"\n   🔴 ROOT CAUSE: Network DNS resolution failure")
            print(f"   The supabase.auth.get_user() call makes an HTTP request to")
            print(f"   {url}/auth/v1/user which requires DNS resolution.")
            print(f"   When DNS fails, this error occurs.")
        elif "invalid" in error_msg.lower() or "401" in error_msg or "unauthorized" in error_msg.lower():
            print(f"\n   ✅ Expected: Invalid token properly rejected by Supabase server")
            print(f"   This means the network path to Supabase Auth IS working.")
            print(f"   The getaddrinfo errors in production may be transient network issues.")
        else:
            print(f"\n   🔍 Unknown error pattern. Check traceback above.")

except Exception as e:
    print(f"❌ FAILED at higher level: {e}")
    traceback.print_exc()

# Step 4: Check supabase library configuration
print("\n" + "=" * 60)
print("STEP 4: SUPABASE LIBRARY VERSION CHECK")
print("=" * 60)
try:
    import supabase
    ver = getattr(supabase, "__version__", "unknown")
    print(f"supabase version: {ver}")
except Exception as e:
    print(f"Could not check version: {e}")

# Step 5: Check httpx configuration (used by supabase-py internally)
print("\n" + "=" * 60)
print("STEP 5: HTTPX TRANSPORT CHECK")
print("=" * 60)
try:
    import httpx
    print(f"httpx version: {httpx.__version__}")
    
    # Check if there's a proxy setting interfering
    proxy_envs = {k: v for k, v in os.environ.items() if 'proxy' in k.lower() or 'HTTP_' in k}
    if proxy_envs:
        print(f"⚠️  Proxy/HTTP environment variables found:")
        for k, v in proxy_envs.items():
            print(f"   {k}={v}")
    else:
        print(f"✅ No proxy environment variables detected")
except Exception as e:
    print(f"Could not check httpx: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)

