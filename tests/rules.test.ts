import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { areasFor } from "../lib/areas.ts";
import { chinaDay } from "../lib/festivals.ts";
import { businessDayAt, nextDayResetAt, normalSearch } from "../lib/rules.ts";
import { readCatalog, filterCatalog, catalogOverview, CATALOG_RELEASE } from "../lib/catalog.ts";
import { allowedPublicOrigin, apiPreflight, withPublicCors } from "../lib/public-api.ts";
import { fetchJson, ConnectionError } from "../lib/http-client.ts";

test("业务日期在北京时间零点切换，不受服务器时区影响",()=>{
  assert.equal(businessDayAt(Date.parse("2026-11-03T15:59:59.999Z")),"2026-11-03");
  assert.equal(businessDayAt(Date.parse("2026-11-03T16:00:00.000Z")),"2026-11-04");
  assert.equal(nextDayResetAt(Date.parse("2026-11-03T15:59:59Z")),"2026-11-03T16:00:00.000Z");
  assert.equal(nextDayResetAt(Date.parse("2026-12-31T16:00:00Z")),"2027-01-01T16:00:00.000Z");
});
test("北京时间零点切换除夕和春节，闰月不重复普通农历节日", () => {
  const before = chinaDay(Date.parse("2026-02-16T15:59:59Z"));
  const after = chinaDay(Date.parse("2026-02-16T16:00:00Z"));
  assert.equal(before.theme?.id, "eve");
  assert.equal(after.theme?.id, "spring");
  assert.equal(after.lunarLabel, "农历正月初一");
  const leap = chinaDay(Date.parse("2023-03-23T12:00:00+08:00"));
  assert.equal(leap.lunarLabel, "农历闰二月初二");
  assert.equal(leap.theme, undefined);
});
test("节气按年度日期触发，国家公祭日使用纪念主题", () => {
  assert.equal(chinaDay(Date.parse("2025-04-04T12:00:00+08:00")).theme?.id, "qingming");
  assert.equal(chinaDay(Date.parse("2026-04-04T12:00:00+08:00")).theme, undefined);
  assert.equal(chinaDay(Date.parse("2026-04-05T12:00:00+08:00")).theme?.id, "qingming");
  assert.equal(chinaDay(Date.parse("2026-12-22T12:00:00+08:00")).theme?.id, "solstice");
  assert.equal(chinaDay(Date.parse("2026-12-13T12:00:00+08:00")).theme?.id, "national-memorial");
});
test("简繁别名检索与空格归一",()=>{
  assert.equal(normalSearch("盧溝橋事變"),normalSearch("卢沟桥事变"));
  assert.equal(normalSearch("八 國 聯 軍"),normalSearch("八国联军"));
  assert.equal(normalSearch("鴉片戰爭 圓明園"),normalSearch("鸦片战争圆明园"));
  assert.equal(readCatalog("盧溝橋").data[0].display_name,"七七事变");
});
test("固定目录与发布锁的数量、摘要一致，只保留公开编目字段",()=>{
  const file=readFileSync(new URL("../data/catalog.json",import.meta.url));
  const lock=JSON.parse(readFileSync(new URL("../data/catalog.lock.json",import.meta.url),"utf8"));
  const records=JSON.parse(file.toString());
  assert.equal(createHash("sha256").update(file).digest("hex"),lock.sha256);
  assert.ok(records.length>=100);assert.equal(records.length,lock.count);
  const fields=["aliases","category","dateLabel","datePrecision","endDate","endYear","id","level","name","parentName","region","startDate","startYear"].sort();
  for(const e of records){
    assert.deepEqual(Object.keys(e).sort(),fields);
    assert.equal(e.startYear,Number(e.startDate.slice(0,4)));
    assert.equal(e.endYear,Number((e.endDate||e.startDate).slice(0,4)));
    assert.match(e.startDate,/^\d{4}(-\d{2})?(-\d{2})?$/);
    assert.equal(e.datePrecision,({4:"year",7:"month",10:"day"} as Record<number,string>)[e.startDate.length]);
    assert.ok(e.dateLabel&&e.region&&e.name);
    assert.ok(!e.endDate||e.endDate>=e.startDate);
  }
  assert.doesNotMatch(file.toString(),/https?:|originFamily|evidenceNote|reviewNotes|sources/);
});
test("分页覆盖固定目录，返回数据被调用者修改不会改变目录",()=>{
  const all=[];let cursor="";
  do{const page=readCatalog("","all",cursor,7);all.push(...page.data);cursor=page.next_cursor||"";assert.equal(page.release_id,CATALOG_RELEASE);}while(cursor);
  const count=catalogOverview().total;assert.equal(all.length,count);assert.equal(new Set(all.map(e=>e.id)).size,count);
  const original=all[0].display_name;all[0].display_name="客户端篡改";
  assert.equal(readCatalog().data[0].display_name,original);
  assert.equal(readCatalog("第二次长沙").data[0].id,"changsha-second-1941");
  assert.equal(readCatalog("不存在的历史条目").total,0);
  assert.throws(()=>readCatalog("","all","unknown-id"),RangeError);
});
test("时间线筛选覆盖年份、类型、地区和跨年事件，不把年精度伪装成日期",()=>{
  const item=(id:string)=>filterCatalog().find(e=>e.id===id)!;
  assert.equal(item("lugou-1937").date_label,"1937年7月7日");
  assert.equal(item("port-arthur-massacre").start_date,"1894");
  assert.equal(item("port-arthur-massacre").date_precision,"year");
  assert.equal(item("amethyst-incident-1949").end_date,null);
  assert.match(item("amethyst-incident-1949").date_label,/起$/);
  assert.ok(filterCatalog({period:"1946-1949"}).some(e=>e.id==="amethyst-incident-1949"));
  assert.ok(filterCatalog({year:"1942"}).every(e=>e.start_date.startsWith("1942")));
  assert.ok(filterCatalog({category:"条约交涉"}).every(e=>e.category==="条约交涉"));
  assert.ok(filterCatalog({query:"宁波"}).some(e=>e.id==="ningbo-bacteriological-attack-1940"));
  assert.ok(filterCatalog({period:"1937-1945"}).some(e=>e.id==="changsha-third-1941"));
  assert.equal(filterCatalog({query:"不存在的历史条目"}).length,0);
  const originalIds=["first-opium-war","battle-of-humen-1841","sanyuanli-resistance","second-opium-war","burning-yuanmingyuan","japan-taiwan-expedition-1874","sino-french-war","zhennanguan-victory","first-sino-japanese-war","port-arthur-massacre","yellow-sea-battle-1894","eight-nation-invasion","gyantse-resistance-1904","qingdao-1914","jinan-1928","mukden-1931","shanghai-1932","lugou-1937","nanjing-massacre-1937","pingxingguan-1937","shanghai-1937","sihang-1937","taierzhuang-1938","wuhan-1938","changsha-first-1939","hundred-regiments-1940","changde-1943"];
  for(const id of originalIds)assert.ok(item(id),id);
});
test("地区索引依据事件地点，支持跨区组合并区分河流与省名",()=>{
  assert.deepEqual(areasFor("hailanpao-massacre-1900","黑龙江北岸海兰泡"),["东北边境"]);
  assert.deepEqual(areasFor("wanxian-incident-1926","四川万县（今重庆万州）"),["重庆"]);
  assert.deepEqual(areasFor("x","湖南长沙、湖北武汉"),["湖北","湖南"]);
  assert.deepEqual(areasFor("x","新加坡"),["境外"]);
  assert.deepEqual(areasFor("x","苏鲁豫皖交界、徐州周边"),["江苏","安徽","山东","河南"]);
  assert.deepEqual(areasFor("x","湘北、鄂南、赣北"),["江西","湖北","湖南"]);
  assert.ok(filterCatalog({area:"湖南"}).some(e=>e.id==="changde-1943"));
  assert.ok(filterCatalog({area:"湖南",year:"1943"}).every(e=>e.start_date.startsWith("1943")&&e.region.includes("湖南")));
  assert.equal(filterCatalog({area:"未编目地区"}).length,0);
});
test("新收录的成立、改编、受降与驻军冲突保留事件区别",()=>{
  const byId=(id:string)=>filterCatalog().find(e=>e.id===id)!;
  assert.equal(byId("new-fourth-army-reorganization-1937").start_date,"1937-10-12");
  assert.equal(byId("new-fourth-army-hq-wuhan-1937").start_date,"1937-12-25");
  assert.equal(byId("nanchang-surrender-1945").start_date,"1945-09-14");
  assert.equal(byId("anping-incident-1946").category,"驻军冲突");
  assert.ok(filterCatalog({category:"成立改编"}).some(e=>e.id==="nanyang-relief-association-1938"));
  assert.ok(filterCatalog({area:"贵州"}).some(e=>e.id==="shenheqiao-resistance-1944"));
  for(const q of ["天津比利时租界","拉萨条约","东北抗日联军统一军队建制宣言"])assert.equal(readCatalog(q).total,0);
});
function database(){const db=new DatabaseSync(":memory:");db.exec(readFileSync(new URL("../drizzle/0000_stiff_iron_fist.sql",import.meta.url),"utf8"));return db;}
test("每日唯一约束允许跨日和不同访客，失效流水不释放当日资格",()=>{
  const db=database();const insert=db.prepare("INSERT OR IGNORE INTO candles(id,visitor_key,business_day,accepted_at,state) VALUES (?,?,?,?,?)");
  for(let i=0;i<100;i++)insert.run(String(i),"visitor-a","2026-11-03","2026-11-03T10:00:00Z","valid");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM candles").get()!.n,1);
  insert.run("next","visitor-a","2026-11-04","2026-11-03T16:00:00Z","valid");
  insert.run("other","visitor-b","2026-11-03","2026-11-03T10:00:00Z","valid");
  db.prepare("UPDATE candles SET state='invalid' WHERE id='0'").run();
  insert.run("retry","visitor-a","2026-11-03","2026-11-03T10:00:01Z","valid");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM candles").get()!.n,3);db.close();
});
test("幂等请求的首次业务日期保留，跨日重试不覆盖日期",()=>{
  const db=database();const insert=db.prepare("INSERT OR IGNORE INTO candle_requests(id,visitor_key,request_key,business_day,accepted_at) VALUES (?,?,?,?,?)");
  insert.run("r1","v","same-key","2026-11-03","2026-11-03T15:59:59Z");insert.run("r2","v","same-key","2026-11-04","2026-11-03T16:00:01Z");
  assert.equal(db.prepare("SELECT business_day FROM candle_requests WHERE visitor_key='v'").get()!.business_day,"2026-11-03");db.close();
});
test("跨站API仅允许已发布的GitHub来源，不接受相似域名和空来源",()=>{
  for(const origin of ["https://hwxc129.github.io.evil.invalid","https://foreign.invalid","null",""]){
    const r=new Request("https://api.invalid/api/v1/visitors",{headers:{origin}});assert.equal(allowedPublicOrigin(r),null);
  }
  const r=new Request("https://api.invalid/api/v1/candles",{method:"OPTIONS",headers:{Origin:"https://hwxc129.github.io","Access-Control-Request-Method":"POST"}});
  const response=apiPreflight(r)!;assert.equal(response.status,204);assert.equal(response.headers.get("Access-Control-Allow-Origin"),"https://hwxc129.github.io");
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"),null);
  assert.equal(withPublicCors(r,new Response("{}",{status:200})).headers.get("Access-Control-Allow-Origin"),"https://hwxc129.github.io");
  const bad=new Request(r,{headers:{Origin:"https://foreign.invalid","Access-Control-Request-Method":"POST"}});assert.equal(apiPreflight(bad)!.status,403);
});
test("旧后台、建议表单和修改接口从路由树中移除",()=>{
  for(const path of ["app/admin/page.tsx","app/admin/panel.tsx","app/api/admin/route.ts","app/corrections/page.tsx","app/api/v1/corrections/route.ts"]){
    assert.throws(()=>readFileSync(new URL("../"+path,import.meta.url)));
  }
});

test("首次读取发生Load failed后自动重连，不直接显示浏览器英文错误",async()=>{
  let calls=0;
  const fetcher: typeof fetch=async()=>{calls++;if(calls===1)throw new TypeError("Load failed");return Response.json({ready:true});};
  assert.deepEqual(await fetchJson("https://example.invalid/state",{}, {fetcher,retryDelayMs:0}),{ready:true});
  assert.equal(calls,2);
});
test("失败的点烛写入不自动重发",async()=>{
  let calls=0;
  const fetcher:typeof fetch=async()=>{calls++;throw new TypeError("Load failed");};
  await assert.rejects(fetchJson("https://example.invalid/candles",{method:"POST"},{fetcher,retryDelayMs:0}),
    (error:unknown)=>error instanceof ConnectionError&&error.kind==="network"&&!error.message.includes("Load failed"));
  assert.equal(calls,1);
});
test("连接超时有明确提示，避免初始化永久等待",async()=>{
  const fetcher:typeof fetch=async(_url,options)=>new Promise<Response>((_resolve,reject)=>{
    options?.signal?.addEventListener("abort",()=>reject(new DOMException("aborted","AbortError")),{once:true});
  });
  await assert.rejects(fetchJson("https://example.invalid/visitors",{method:"POST"},{fetcher,timeoutMs:5}),
    (error:unknown)=>error instanceof ConnectionError&&error.kind==="timeout");
});
test("权限和业务错误保留服务端提示，且不重复读取",async()=>{
  let calls=0;
  const fetcher:typeof fetch=async()=>{calls++;return Response.json({error:"请允许必要的浏览器存储。"},{status:401});};
  await assert.rejects(fetchJson("https://example.invalid/state",{}, {fetcher,retryDelayMs:0}),/请允许必要的浏览器存储/);
  assert.equal(calls,1);
});
test("非JSON服务响应不当作成功，读取最多尝试三次",async()=>{
  let calls=0;
  const fetcher:typeof fetch=async()=>{calls++;return new Response("gateway page",{headers:{"content-type":"text/html"}});};
  await assert.rejects(fetchJson("https://example.invalid/state",{}, {fetcher,retryDelayMs:0}),
    (error:unknown)=>error instanceof ConnectionError&&error.kind==="response");
  assert.equal(calls,3);
});
