interface ApiMessage {
  message?: unknown;
}

export type JsonRequestResult<T> =
  | { ok: true; data: T | null; status: number }
  | { ok: false; message: string; status: number | null };

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<JsonRequestResult<T>> {
  try {
    const response = await fetch(input, init);
    const data = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? (data as ApiMessage).message
          : null;
      return {
        ok: false,
        message: typeof message === "string" && message ? message : fallbackMessage,
        status: response.status,
      };
    }

    return { ok: true, data, status: response.status };
  } catch {
    return {
      ok: false,
      message: "网络连接失败，请检查网络后重试。",
      status: null,
    };
  }
}
