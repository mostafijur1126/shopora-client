const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";
const PRODUCT_MEDIA_API =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

export async function uploadProductMediaApi(file: Blob): Promise<string> {
  const token = localStorage.getItem("shopora_admin_token");
  let response: Response;
  try {
    response = await fetch(`${PRODUCT_MEDIA_API}/uploads/media`, {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": file.type,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Media upload failed (${response.status}).`);
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Media storage did not return a URL.");
  }
  return data.url;
}

export async function uploadPaymentProofApi(file: File): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${PRODUCT_MEDIA_API}/uploads/payment-proof`, {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Screenshot upload failed (${response.status}).`);
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Media storage did not return a screenshot URL.");
  }
  return data.url;
}

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
