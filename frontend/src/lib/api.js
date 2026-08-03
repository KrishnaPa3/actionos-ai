import { supabase } from "./supabase";

const API = import.meta.env.VITE_API_URL || "";
const DEFAULT_TIMEOUT_MS = 20000;

function getErrorMessage(payload, fallback) {
    if (!payload) {
        return fallback;
    }

    if (typeof payload === "string") {
        return payload;
    }

    if (payload.detail) {
        return typeof payload.detail === "string" ? payload.detail : "The request could not be completed.";
    }

    if (payload.message) {
        return payload.message;
    }

    if (payload.error) {
        return payload.error;
    }

    return fallback;
}

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

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        let payload = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            payload = await response.json();
        } else {
            payload = await response.text();
        }

        if (!response.ok) {
            const message = getErrorMessage(payload, "The server returned an unexpected error.");
            throw new Error(message);
        }

        return {
            ok: true,
            status: response.status,
            headers: response.headers,
            async json() {
                return payload;
            },
            async text() {
                return typeof payload === "string" ? payload : JSON.stringify(payload);
            },
        };
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("The request timed out. Please try again.");
        }

        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            throw new Error("Network error. Please check your connection and try again.");
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}
