import { supabase } from "@/integrations/supabase/client";

type ApiInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;

  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : "Erro ao chamar backend.";
    throw new Error(message);
  }

  return payload as T;
}

export function dataUrl(op: string, params: Record<string, string | number | boolean | null | undefined> = {}) {
  const searchParams = new URLSearchParams({ op });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  return `/api/data?${searchParams.toString()}`;
}
