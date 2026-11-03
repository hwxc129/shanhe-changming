import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { businessDayAt, nextDayResetAt, normalSearch } from "../lib/rules.ts";
import { readCatalog, CATALOG_RELEASE } from "../lib/catalog.ts";
import { allowedPublicOrigin, apiPreflight, withPublicCors } from "../lib/public-api.ts";

test("业务日期在北京时间零点切换，不受服务器时区影响",()=>{
  assert.equal(businessDayAt(Date.parse("2026-11-03T15:59:59.999Z")),"2026-11-03");
  assert.equal(businessDayAt(Date.parse("2026-11-03T16:00:00.000Z")),"2026-11-04");
  assert.equal(nextDayResetAt(Date.parse("2026-11-03T15:59:59Z")),"2026-11-03T16:00:00.000Z");
  assert.equal(nextDayResetAt(Date.parse("2026-12-31T16:00:00Z")),"2027-01-01T16:00:00.000Z");
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
  assert.equal(records.length,27);assert.equal(records.length,lock.count);
  for(const e of records)assert.deepEqual(Object.keys(e).sort(),["aliases","endYear","id","name","startYear"]);
});
test("分页覆盖固定目录，返回数据被调用者修改不会改变目录",()=>{
  const all=[];let cursor="";
  do{const page=readCatalog("","all",cursor,7);all.push(...page.data);cursor=page.next_cursor||"";assert.equal(page.release_id,CATALOG_RELEASE);}while(cursor);
  assert.equal(all.length,27);assert.equal(new Set(all.map(e=>e.id)).size,27);
  const original=all[0].display_name;all[0].display_name="客户端篡改";
  assert.equal(readCatalog().data[0].display_name,original);
  assert.equal(readCatalog("第二次长沙").total,0);
  assert.throws(()=>readCatalog("","all","unknown-id"),RangeError);
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
