"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, Flame, Share2 } from "lucide-react";
import InfoPage from "../info-page";
import { siteHref } from "../../lib/api-client";
import { entryMarkup, shareLink } from "../../lib/sharing";

export default function SharePage() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const download = (name: string) => import.meta.env.VITE_PACKAGE_EDITION
    ? "https://hwxc129.github.io/shanhe-changming/downloads/" + name
    : siteHref("/downloads/" + name);
  useEffect(() => { setUrl(shareLink(new URL(siteHref("/"), window.location.origin).href)); }, []);

  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setMessage(label + "已复制。"); }
    catch { setMessage("未能自动复制，请在下方文本框中选择并复制。"); }
  }
  async function share() {
    if (!navigator.share) { await copy(url, "网站链接"); return; }
    try { await navigator.share({ title: "山河长明 · 铭记历史", text: "点亮一烛，铭记历史，守望和平。", url }); setMessage("分享已完成。"); }
    catch (error) { if ((error as Error).name !== "AbortError") setMessage("暂时无法打开分享菜单，可以复制链接分享。"); }
  }

  return <InfoPage title="分享与部署">
    <p className="share-intro">分享给朋友，在自己的网页放一个入口，或把这处纪念空间部署到自己的服务器。</p>
    <section className="share-panel" aria-labelledby="share-title">
      <span className="share-step">01 · 分享</span><h2 id="share-title">把纪念站分享给朋友</h2>
      <p>一条链接，一份共同的铭记。</p>
      <div className="share-actions"><button type="button" onClick={share} disabled={!url}><Share2 size={17} aria-hidden="true" />分享网站</button><button type="button" className="share-secondary" onClick={() => copy(url, "网站链接")} disabled={!url}>{copied === "网站链接" ? <Check size={17} /> : <Copy size={17} />}复制链接</button></div>
      <label className="share-field">网站链接<input readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>
    </section>
    <section className="share-panel" aria-labelledby="entry-title">
      <span className="share-step">02 · 网页入口</span><h2 id="entry-title">放进你的网站</h2>
      <p>复制这段入口代码，粘贴到自己网页的HTML区域即可。</p>
      <a className="memorial-entry-preview" href={url || undefined} target="_blank" rel="noopener noreferrer"><Flame size={31} aria-hidden="true" /><span><strong>山河长明</strong><small>铭记历史 · 致敬英雄</small></span><ArrowUpRight size={19} aria-hidden="true" /></a>
      <label className="share-field">入口代码<textarea readOnly rows={4} value={url ? entryMarkup(url) : ""} onFocus={event => event.currentTarget.select()} /></label>
      <button type="button" className="share-copy-code" onClick={() => copy(entryMarkup(url), "入口代码")} disabled={!url}><Copy size={16} aria-hidden="true" />复制入口代码</button>
    </section>
    <section className="share-panel" aria-labelledby="deploy-title">
      <span className="share-step">03 · 自己部署</span><h2 id="deploy-title">选一种适合你的方式</h2>
      <div className="deploy-options">
        <article><h3>完整服务器版</h3><p>包含独立点烛服务、全站统计与本浏览器打卡次数。数据保存在自己的服务器。</p><ol><li>下载并解压安装包。</li><li>按说明填写自己的网站地址。</li><li>运行包内启动命令。</li></ol><a download href={download("shanhe-server.zip")}><Download size={16} aria-hidden="true" />下载服务器版</a><small>提供Docker和Node.js两种启动方式。</small></article>
        <article><h3>纯静态网页版</h3><p>无需数据库，上传到已有网站即可。每日点烛和累计次数只保存在当前浏览器。</p><ol><li>下载并解压网页包。</li><li>上传其中的shanhe-changming文件夹。</li><li>打开说明中的访问地址。</li></ol><a download href={download("shanhe-static.zip")}><Download size={16} aria-hidden="true" />下载静态版</a><small>不显示全站累计，不连接原站点烛服务。</small></article>
      </div>
      <p className="deploy-scope">两种版本都保留固定历史目录、原创配乐与节日主题，无内容管理后台。独立部署后的计数与原站分开；清除浏览器数据或更换浏览器，会产生新的打卡身份。</p>
    </section>
    <p className="share-status" role="status" aria-live="polite">{message}</p>
  </InfoPage>;
}
