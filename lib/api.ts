import { supabase, API_BASE_URL } from "@/lib/supabase";

/**
 * Fetch autenticado: inyecta el JWT de Supabase en cada petición.
 * Refresca el token automáticamente si está por vencer.
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Obtener sesión válida (Supabase la refresca si es necesario)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    // Token expirado: intentar refrescar y reintentar
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) {
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshed.session.access_token}`,
          ...(options.headers || {}),
        },
      });
    }
  }

  return response;
}

/**
 * Helper para peticiones JSON autenticadas.
 * Lanza error automáticamente si la respuesta no es OK.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(endpoint, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Error ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}
