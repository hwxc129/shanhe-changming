export class BodyError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function readBoundedJson(request: Request, limit = 25_000) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new BodyError(415, "请使用正确的数据格式。");
  // Count the actual stream; Content-Length may be absent and an early unread
  // rejection can leave a local HTTP keep-alive connection in an unusable state.
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) {
          await reader.cancel();
          throw new BodyError(413, "提交内容过长。");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
  }
  try { return JSON.parse(text); } catch { throw new BodyError(400, "提交内容格式不正确。"); }
}
