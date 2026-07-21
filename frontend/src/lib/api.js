import { supabase } from "./supabase";

const API = "http://127.0.0.1:8000";

async function authHeaders() {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    console.log("Session:", session);
    console.log("Access Token:", session?.access_token);

    return {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
    };
}
export async function apiFetch(path, options = {}) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
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