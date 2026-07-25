"""
Diagnostic script - Part 2: Test HTTP/2 vs HTTP/1.1 behavior and
repeated auth requests to reproduce the intermittent failure.
"""
import os
import time
import traceback

from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_KEY", "")

print("=" * 60)
print("DIAGNOSTIC 2: REPRODUCING INTERMITTENT FAILURES")
print("=" * 60)

# Test 1: Check if HTTP/2 is causing the issue
print("\n" + "=" * 60)
print("TEST 1: HTTP/2 CONFIGURATION CHECK")
print("=" * 60)
try:
    import httpx
    # Check default transport
    client = httpx.Client()
    print(f"  Default httpx transport: {type(client._transport).__name__}")
    
    # Check if h2 is installed (HTTP/2 support)
    try:
        import h2
        print(f"  h2 version: {h2.__version__} - HTTP/2 IS available")
        print(f"  httpx will attempt HTTP/2 connections by default")
    except ImportError:
        print(f"  h2 NOT installed - using HTTP/1.1 only")
    
    client.close()
except Exception as e:
    print(f"  Error: {e}")

# Test 2: Test auth.get_user with repeated calls (to trigger intermittent failures)
print("\n" + "=" * 60)
print("TEST 2: REPEATED AUTH.GET_USER CALLS (10x)")
print("=" * 60)
try:
    from supabase import create_client
    
    # Create a real client with the real key
    test_client = create_client(url, key)
    
    success_count = 0
    fail_count = 0
    
    for i in range(10):
        try:
            start = time.time()
            # Using a properly formatted but invalid JWT (3 segments)
            fake_token = "eyJhbGciOiJIUzI1NiJ9.dGVzdA.test"
            result = test_client.auth.get_user(fake_token)
            elapsed = time.time() - start
            print(f"  Attempt {i+1}: returned (unexpected) - {elapsed:.3f}s")
        except Exception as e:
            elapsed = time.time() - start
            err_str = str(e)
            if "getaddrinfo" in err_str or "Errno 11002" in err_str or "Name or service not known" in err_str:
                print(f"  ❌ Attempt {i+1}: DNS FAILURE ({elapsed:.3f}s): {err_str[:80]}")
                fail_count += 1
            elif "ConnectionTerminated" in err_str or "connection" in err_str.lower():
                print(f"  ⚠️  Attempt {i+1}: CONNECTION TERMINATED ({elapsed:.3f}s): {err_str[:80]}")
                fail_count += 1
            else:
                # Expected error - invalid token properly rejected
                print(f"  ✅ Attempt {i+1}: Expected error ({elapsed:.3f}s): {err_str[:60]}")
                success_count += 1
    
    print(f"\n  Results: {success_count} expected, {fail_count} failures")
    if fail_count > 0:
        print(f"  ❌ Intermittent failures reproduced!")
    else:
        print(f"  ✅ No intermittent failures in this run (may appear under load)")
    
    test_client.auth.close()
except Exception as e:
    print(f"  Error: {e}")
    traceback.print_exc()

# Test 3: Test with HTTP/1.1 only (disable HTTP/2)
print("\n" + "=" * 60)
print("TEST 3: AUTH.GET_USER WITH HTTP/1.1 ONLY")
print("=" * 60)
try:
    import httpx
    from supabase import create_client
    
    # Create a client with HTTP/1.1 only
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    
    # Mount both http and https with HTTP/1.1 only transports
    transport = httpx.HTTPTransport(retries=2)
    
    client_h1 = create_client(
        url,
        key,
        transport=transport
    )
    
    success_count = 0
    fail_count = 0
    
    for i in range(10):
        try:
            start = time.time()
            fake_token = "eyJhbGciOiJIUzI1NiJ9.dGVzdA.test"
            result = client_h1.auth.get_user(fake_token)
            elapsed = time.time() - start
            print(f"  Attempt {i+1}: returned (unexpected) - {elapsed:.3f}s")
        except Exception as e:
            elapsed = time.time() - start
            err_str = str(e)
            if "getaddrinfo" in err_str:
                print(f"  ❌ Attempt {i+1}: DNS FAILURE ({elapsed:.3f}s)")
                fail_count += 1
            else:
                print(f"  ✅ Attempt {i+1}: Expected error ({elapsed:.3f}s): {err_str[:60]}")
                success_count += 1
    
    print(f"\n  HTTP/1.1 Results: {success_count} expected, {fail_count} failures")
    if fail_count > 0:
        print(f"  ❌ DNS failures still occur with HTTP/1.1")
    else:
        print(f"  ✅ HTTP/1.1 handled all requests (no DNS failures)")
    
    client_h1.auth.close()
except Exception as e:
    print(f"  HTTP/1.1 test error: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)

