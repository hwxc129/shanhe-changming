import test from "node:test";
import assert from "node:assert/strict";
import { openCandleDatabase } from "../deploy/sqlite.mjs";
import { createCandleService } from "../lib/candle-core.ts";
import { lightLocalCandle, localCandleState } from "../lib/local-candles.ts";
import { shareLink, entryMarkup } from "../lib/sharing.ts";

test("本浏览器累计来自有效记录，跨日保留、幂等不增，其他浏览器隔离", async () => {
  const db = openCandleDatabase(":memory:");
  let now = Date.parse("2026-11-03T12:00:00+08:00");
  const service = createCandleService({ database: () => db, now: () => now, publicOrigin: () => null });
  const fresh = () => new Request("https://memorial.example/api/v1/visitors", { method: "POST", headers: { Origin: "https://memorial.example" } });
  async function identity() {
    const result = await service.issueVisitor(fresh());
    return new Request("https://memorial.example/api/v1/candles", { headers: { Cookie: result.headers.get("set-cookie")!.split(";")[0] } });
  }
  try {
    const one = await identity(); const two = await identity();
    assert.equal((await service.candleState(one)).browser_total_count, 0);
    const oldKey = crypto.randomUUID();
    const concurrent = await Promise.all(Array.from({ length: 50 }, () => service.lightCandle(one, oldKey)));
    assert.equal(concurrent.filter(record => record.result === "created").length, 1);
    assert.equal((await service.candleState(one)).browser_total_count, 1);
    assert.equal((await service.candleState(two)).browser_total_count, 0);
    now += 86_400_000;
    assert.equal((await service.candleState(one)).can_light, true);
    await service.lightCandle(one, oldKey);
    assert.equal((await service.candleState(one)).browser_total_count, 1);
    await service.lightCandle(one, crypto.randomUUID());
    assert.equal((await service.candleState(one)).browser_total_count, 2);
    assert.equal((await service.candleState(two)).browser_total_count, 0);
    const anonymous = await service.candleState(fresh());
    assert.equal(anonymous.ready, false); assert.equal(anonymous.browser_total_count, 0);
  } finally { db.close(); }
});

test("静态版仅保存本浏览器按北京时间去重的纪念日期", () => {
  const saved = new Map<string, string>();
  const store = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
  const before = Date.parse("2026-11-03T15:59:59Z");
  const after = Date.parse("2026-11-03T16:00:01Z");
  assert.equal(localCandleState(store, "mine", before).browser_total_count, 0);
  assert.equal(lightLocalCandle(store, "mine", before).result, "created");
  assert.equal(lightLocalCandle(store, "mine", before).result, "already_lit");
  assert.equal(localCandleState(store, "mine", before).browser_total_count, 1);
  assert.equal(localCandleState(store, "mine", after).can_light, true);
  lightLocalCandle(store, "mine", after);
  assert.equal(localCandleState(store, "mine", after).browser_total_count, 2);
  assert.equal(localCandleState(store, "other", after).browser_total_count, 0);
  saved.set("broken", "invalid stored content");
  assert.throws(() => lightLocalCandle(store, "broken", after));
  assert.equal(saved.get("broken"), "invalid stored content");
});

test("分享只含网站地址，入口代码转义并使用独立新窗口", () => {
  assert.equal(shareLink("https://example.com/memorial/?visitor=private#memorial"), "https://example.com/memorial/");
  assert.throws(() => shareLink("javascript:alert(1)"));
  assert.throws(() => shareLink("https://user:secret@example.com/"));
  const markup = entryMarkup("https://example.com/x\"onmouseover=\"bad");
  assert.ok(markup.includes('rel="noopener noreferrer"'));
  assert.ok(!markup.includes('"onmouseover="'));
  assert.ok(!markup.includes("<script"));
});
