export class ConnectionError extends Error {
  readonly kind: "network" | "timeout" | "response";
  constructor(kind: "network" | "timeout" | "response") {
    super(kind === "timeout" ? "连接超时，请稍后重试。" : kind === "response" ?
      "点烛服务暂时无法连接，请稍后重试。" : "连接暂时中断，请重试或使用备用站点。");
    this.name = "ConnectionError";
    this.kind = kind;
  }
}

// Only reads are automatically retried. Candle writes keep the caller's
// idempotency key and are confirmed through the personal state endpoint.
export async function fetchJson<T>(url: string | URL, options: RequestInit = {}, policy: {
  fetcher?: typeof fetch; timeoutMs?: number; retryDelayMs?: number;
} = {}): Promise<T> {
  const fetcher = policy.fetcher ?? fetch;
  const attempts = ["GET", "HEAD"].includes((options.method || "GET").toUpperCase()) ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), policy.timeoutMs ?? 8000);
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    try {
      let response: Response;
      try { response = await fetcher(url, { ...options, signal }); }
      catch (error) {
        if (options.signal?.aborted) throw error;
        if (controller.signal.aborted) throw new ConnectionError("timeout");
        if (error instanceof TypeError || (error as Error).name === "NetworkError") throw new ConnectionError("network");
        throw error;
      }
      if ([502, 503, 504].includes(response.status)) throw new ConnectionError("response");
      if (!response.headers.get("content-type")?.includes("application/json")) throw new ConnectionError("response");
      const data = await response.json() as T & { error?: string };
      if (!response.ok) throw new Error(data.error || "操作未成功，请稍后重试。");
      return data;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (controller.signal.aborted) error = new ConnectionError("timeout");
      else if (error instanceof TypeError) error = new ConnectionError("network");
      else if (error instanceof SyntaxError) error = new ConnectionError("response");
      if (!(error instanceof ConnectionError) || attempt === attempts - 1) throw error;
    } finally { clearTimeout(timer); }
    await new Promise(resolve => setTimeout(resolve, (policy.retryDelayMs ?? 350) * (attempt + 1)));
  }
  throw new ConnectionError("network");
}
