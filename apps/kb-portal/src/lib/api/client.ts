const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

const DEFAULT_TIMEOUT_MS = 15_000;

function mergeAbortSignals(
  userSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): AbortSignal {
  if (!userSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (userSignal.aborted || timeoutSignal.aborted) {
    controller.abort();
  } else {
    userSignal.addEventListener("abort", abort, { once: true });
    timeoutSignal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
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
  console.log("in api fetch", path, options);
  const { signal: userSignal, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;
  const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const signal = mergeAbortSignals(userSignal ?? undefined, timeoutSignal);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string>),
    },
    ...rest,
    signal,
  });

  console.log(res);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.message || `API request failed: ${res.status}`,
    );
  }

  return res.json();
}
