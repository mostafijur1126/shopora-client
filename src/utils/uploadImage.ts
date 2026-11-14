const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token"); // <- apnar key name onujayi change korun
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function uploadImageApi(
  blob: Blob,
  name: string,
): Promise<string | null> {
  const body = new FormData();
  body.append("image", blob, name);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body, // do NOT set Content-Type, the browser adds the boundary
      credentials: "include",
      headers: authHeaders(),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }

  if ([404, 405, 501].includes(res.status)) return null;

  if (!res.ok) {
    let msg = `Upload failed (${res.status}).`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const url: unknown =
    data?.url ?? data?.imageUrl ?? data?.secure_url ?? data?.data?.url;
  if (typeof url !== "string" || !url)
    throw new Error("The server did not return an image URL.");

  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}
