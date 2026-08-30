# =============================================================================
# set-oauth-env.ps1
#
# Pushes the Notion / Google / Slack OAuth client credentials into Secret
# Manager and wires them onto the Cloud Run API service, together with the
# production redirect URIs.
#
# WHY THIS EXISTS
#   The root .env is excluded from the image by backend/.dockerignore
#   (correctly - secrets do not belong in an image), and the six OAuth
#   variables were never set on the Cloud Run service. In production
#   config.py therefore resolves them to "" and get_oauth_config() raises
#   RuntimeError, so /oauth/<provider>/login returns 500 and every "Connect"
#   button is dead. Locally docker-compose feeds the same values in from the
#   root .env, so the identical code works.
#
# CREDENTIAL SOURCE
#   The repo-root .env - NOT backend/.env, which contains placeholder text
#   ("your_notion_client_id" and friends). Pushing those placeholders to
#   Secret Manager would replace a loud "not configured" 500 with a quiet
#   invalid_client rejection from each provider, which is strictly worse.
#   The format checks below exist to make that mistake impossible.
#
#   The localhost redirect URIs in .env are deliberately ignored; production
#   ones are derived from $BackendUrl.
#
# USAGE (PowerShell, from anywhere)
#   D:\ActionOS-AI\scripts\set-oauth-env.ps1
#
# BEFORE RUNNING: register the production callback URLs in each provider's
# console (printed at the end), or the flow dies one step later with
# redirect_uri_mismatch.
# =============================================================================

$Project        = "krishna-test-504810"
$Service        = "actionos-backend"
$Region         = "asia-south1"
$BackendUrl     = "https://actionos-backend-155371662264.asia-south1.run.app"
$ServiceAccount = "155371662264-compute@developer.gserviceaccount.com"
$EnvFile        = Join-Path $PSScriptRoot "..\.env"

# gcloud writes progress to stderr. Under $ErrorActionPreference = "Stop"
# PowerShell 5.1 turns that into a NativeCommandError and aborts a call that
# actually succeeded, so exit codes are checked explicitly instead.
$ErrorActionPreference = "Continue"

function Invoke-GCloud {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $GcloudArgs)
    $output = & gcloud @GcloudArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud $($GcloudArgs -join ' ') failed (exit $LASTEXITCODE):`n$output"
    }
    return $output
}

if (-not (Test-Path $EnvFile)) {
    throw "Cannot find $EnvFile"
}

# --- parse the root .env ----------------------------------------------------
$envMap = @{}
foreach ($line in Get-Content $EnvFile) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
    $i = $trimmed.IndexOf("=")
    if ($i -lt 1) { continue }
    $key = $trimmed.Substring(0, $i).Trim()
    $val = $trimmed.Substring($i + 1).Trim().Trim('"').Trim("'")
    $envMap[$key] = $val
}

# --- refuse to ship anything that is not a real credential ------------------
# Each pattern is the provider's documented format, so a placeholder, a
# truncated paste or a swapped id/secret fails here rather than in production.
$expected = [ordered]@{
    "NOTION_CLIENT_ID"     = @('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'a UUID')
    "NOTION_CLIENT_SECRET" = @('^secret_[A-Za-z0-9]+$',                                          'secret_…')
    "GOOGLE_CLIENT_ID"     = @('^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$',                  '…apps.googleusercontent.com')
    "GOOGLE_CLIENT_SECRET" = @('^GOCSPX-[A-Za-z0-9_\-]+$',                                       'GOCSPX-…')
    "SLACK_CLIENT_ID"      = @('^\d+\.\d+$',                                                     'digits.digits')
    "SLACK_CLIENT_SECRET"  = @('^[0-9a-f]{32}$',                                                 '32 hex chars')
}

$problems = @()
foreach ($key in $expected.Keys) {
    $val = $envMap[$key]
    if ([string]::IsNullOrWhiteSpace($val)) {
        $problems += "$key is missing or empty in $EnvFile"
    } elseif ($val -notmatch $expected[$key][0]) {
        # The value itself is never printed.
        $problems += "$key does not look like a real credential (expected $($expected[$key][1]))"
    }
}
if ($problems) {
    throw "Refusing to push credentials:`n  " + ($problems -join "`n  ")
}

Write-Host "All six credentials validated against their provider formats." -ForegroundColor Green

# --- create / update each secret -------------------------------------------
foreach ($key in $expected.Keys) {
    & gcloud secrets describe $key --project=$Project 2>&1 | Out-Null
    $secretExists = ($LASTEXITCODE -eq 0)

    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        # WriteAllText appends no newline. A stray trailing newline inside a
        # client secret breaks the token exchange in ways that are miserable
        # to debug, so this must not go through Set-Content.
        [System.IO.File]::WriteAllText($tmp, $envMap[$key], (New-Object System.Text.UTF8Encoding($false)))

        if ($secretExists) {
            Write-Host "  $key - adding new version"
            Invoke-GCloud secrets versions add $key --data-file=$tmp --project=$Project | Out-Null
        } else {
            Write-Host "  $key - creating"
            Invoke-GCloud secrets create $key --data-file=$tmp --replication-policy=automatic --project=$Project | Out-Null
        }
    } finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }

    Invoke-GCloud secrets add-iam-policy-binding $key `
        --member="serviceAccount:$ServiceAccount" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$Project | Out-Null
}

# --- wire onto Cloud Run in a single revision -------------------------------
# --update-* merge with what is already on the service. --set-* would wipe the
# Supabase secret refs and take the API down, so do not swap them in.
$secretRefs = ($expected.Keys | ForEach-Object { "$_=${_}:latest" }) -join ","
$redirects  = "NOTION_REDIRECT_URI=$BackendUrl/oauth/notion/callback," +
              "GOOGLE_REDIRECT_URI=$BackendUrl/oauth/google/callback," +
              "SLACK_REDIRECT_URI=$BackendUrl/oauth/slack/callback"

Write-Host "Updating Cloud Run service $Service (one new revision)..."
Invoke-GCloud run services update $Service `
    --region=$Region --project=$Project `
    --update-secrets="$secretRefs" `
    --update-env-vars="$redirects"

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Register these callback URLs in the provider consoles if you have not."
Write-Host "Keep the existing http://localhost:8000/... entries so local dev keeps working."
Write-Host "  Notion  notion.so/my-integrations                        $BackendUrl/oauth/notion/callback"
Write-Host "  Google  Cloud Console > APIs & Services > Credentials    $BackendUrl/oauth/google/callback"
Write-Host "  Slack   api.slack.com/apps > OAuth & Permissions         $BackendUrl/oauth/slack/callback"
