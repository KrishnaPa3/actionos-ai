import { supabase } from "./supabase";

const API = import.meta.env.VITE_API_URL || "";

export async function apiFetch(path, options = {}) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error("No active authentication session.");
    }

    const headers = {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
    };

    // Only set JSON content type if NOT sending FormData
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(`${API}${path}`, {
        ...options,
        headers,
    });
}

/**
 * Pull a human-readable reason out of a failed API response.
 *
 * FastAPI puts the useful message in `detail` (e.g. "No default Slack channel
 * is configured. Please select one in Integrations."). Callers that skip this
 * and only test `data.success` swallow the reason entirely and appear to do
 * nothing at all, which is how a production OAuth outage stayed invisible.
 */
export async function readErrorDetail(response) {
    try {
        const body = await response.json();
        if (body && body.detail) return String(body.detail);
    } catch {
        // Non-JSON error body (HTML error page, empty response, ...).
    }
    return `Request failed with status ${response.status}.`;
}
