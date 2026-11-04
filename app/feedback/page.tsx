"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import InfoPage from "../info-page";
import { buildFeedbackUrl, FEEDBACK_ISSUES_URL, type FeedbackDraft } from "../../lib/feedback";

export default function FeedbackPage() {
  const [kind, setKind] = useState<FeedbackDraft["kind"]>("史实修改");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTitle((params.get("event") || "").slice(0, 80));
  }, []);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      setLink(buildFeedbackUrl({
        kind, title, date: String(values.get("date") || ""), detail: String(values.get("detail") || ""),
        sourceOne: String(values.get("sourceOne") || ""), sourceTwo: String(values.get("sourceTwo") || ""),
      }));
      setError("");
    } catch (failure) { setError((failure as Error).message); setLink(""); }
  }

  return <InfoPage title="意见与史实建议">
    <p>欢迎指出日期、名称、叙述问题，或提供遗漏事件。史实修改与补充建议请附两条官方、档案馆、纪念馆或学术机构来源。</p>
    <p className="feedback-public-note">建议通过 GitHub Issues 公开提交，需要登录 GitHub。请只填写事件与资料，避免留下个人联系方式。</p>
    <form className="feedback-form" onSubmit={prepare} onChange={() => setLink("")}>
      <label>建议类型<select value={kind} onChange={event => setKind(event.target.value as FeedbackDraft["kind"])}><option>史实修改</option><option>补充事件</option><option>网站意见</option></select></label>
      <label>相关事件或页面<input required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} /></label>
      {kind !== "网站意见" && <label>事件时间<input name="date" maxLength={35} placeholder="例如 1945年9月9日，或说明日期分歧" /></label>}
      <label>建议内容<textarea name="detail" required maxLength={500} rows={5} placeholder="请说明需要修改或补充的事实，以及依据。" /></label>
      <label>来源一<input name="sourceOne" type="url" maxLength={250} required={kind !== "网站意见"} placeholder="https://" /></label>
      <label>来源二<input name="sourceTwo" type="url" maxLength={250} required={kind !== "网站意见"} placeholder="https://" /></label>
      <p className="feedback-rule">每条史实建议会核对原始材料与转载关系，通过后发布新版目录。</p>
      {error && <p className="feedback-error" role="alert">{error}</p>}
      <button type="submit" className="feedback-prepare">生成提交内容</button>
      {link && <a className="feedback-submit" href={link} target="_blank" rel="noopener noreferrer">前往 GitHub 确认并提交 <ExternalLink size={15} aria-hidden="true" /></a>}
    </form>
    <p><a className="feedback-existing" href={FEEDBACK_ISSUES_URL} target="_blank" rel="noreferrer">查看已提交的建议</a></p>
  </InfoPage>;
}
