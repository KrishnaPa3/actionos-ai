import { supabase } from "./supabase";

const API = "http://127.0.0.1:8000";

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
