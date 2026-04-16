const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

function formatApiMessage(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) {
      return m.map((x) => String(x)).filter(Boolean).join(", ");
    }
  }
  return "";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = formatApiMessage(body);
    throw new ApiError(
      res.status,
      msg || `API request failed: ${res.status}`,
    );
  }

  return res.json();
}
