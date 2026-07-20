import { supabase } from "./supabase";

const API = "http://127.0.0.1:8000";

async function authHeaders() {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    return {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
    };
}

export async function apiFetch(path, options = {}) {
    const headers = await authHeaders();

    return fetch(`${API}${path}`, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {}),
        },
    });
}