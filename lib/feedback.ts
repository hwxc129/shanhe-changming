export const FEEDBACK_ISSUES_URL = "https://github.com/hwxc129/shanhe-changming/issues";

export type FeedbackDraft = {
  kind: "史实修改" | "补充事件" | "网站意见";
  title: string;
  date: string;
  detail: string;
  sourceOne: string;
  sourceTwo: string;
};

export function buildFeedbackUrl(draft: FeedbackDraft) {
  if (!["史实修改", "补充事件", "网站意见"].includes(draft.kind)) throw new Error("请选择建议类型。");
  const title = draft.title.trim();
  const detail = draft.detail.trim();
  if (!title || title.length > 80 || !detail || detail.length > 500) throw new Error("请填写标题和建议内容。");
  if (draft.date.length > 35) throw new Error("时间说明过长。");
  const sources = [draft.sourceOne.trim(), draft.sourceTwo.trim()];
  if (draft.kind !== "网站意见" && sources.some(source => !source)) throw new Error("史实建议请提供两条官方或机构来源链接。");
  for (const source of sources.filter(Boolean)) {
    let url: URL;
    try { url = new URL(source); } catch { throw new Error("请填写完整的来源链接。"); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || source.length > 250) {
      throw new Error("来源链接需为公开的 HTTP 或 HTTPS 网页。");
    }
  }
  const body = [
    "建议类型", draft.kind, "", "相关事件或页面", title, "",
    "事件时间", draft.date.trim() || "未填写", "",
    "建议内容", detail, "", "来源一", sources[0] || "未填写", "",
    "来源二", sources[1] || "未填写", "",
    "提交说明", "本建议供人工交叉核对，通过审校后随固定目录版本发布。",
  ].join("\n");
  const url = new URL(FEEDBACK_ISSUES_URL + "/new");
  url.searchParams.set("title", `[${draft.kind}] ${title}`);
  url.searchParams.set("body", body);
  return url.href;
}
