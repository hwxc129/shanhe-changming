import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { siteHref } from "../lib/api-client";
import { Brand, Footer } from "./memorial";
export default function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return <><header className="site-header"><Brand /><nav><a href={siteHref("/#memorial")}>纪念</a><a href={siteHref("/#events")}>历史铭记</a></nav></header><main className="page-shell"><a className="back-link" href={siteHref("/")}><ArrowLeft size={14}/>回到纪念首页</a><h1>{title}</h1>{children}</main><Footer/></>;
}
