export function shareLink(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("分享地址需要是公开网站链接。");
  url.search = "";
  url.hash = "";
  return url.href;
}

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function entryMarkup(value: string) {
  const url = escape(shareLink(value));
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:14px;padding:16px 22px;border:1px solid #c9ad75;border-radius:8px;background:#151b14;color:#ead4a7;text-decoration:none;font-family:serif;line-height:1.6"><span aria-hidden="true" style="font-size:26px">🕯</span><span><strong style="display:block;font-size:18px;font-weight:500">山河长明</strong><span style="font-size:12px">铭记历史 · 致敬英雄 · 点击进入</span></span></a>`;
}
