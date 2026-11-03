# 山河长明

中国历史英雄纪念网站。1840—1945年事件名称固定目录，匿名浏览器每日点烛，全站真实累计次数。

## 公网地址

- GitHub Pages：https://hwxc129.github.io/shanhe-changming/
- 点烛服务及备用站点：https://shanhe-remembrance-20261103.vkvbb39.chatgpt.site

完整前台由GitHub Pages托管。每日资格与纪念流水由Cloudflare Workers / D1服务保存，计数不是静态演示数据。GitHub Pages不提供服务端代码运行环境，说明见[GitHub官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

## 固定数据，无管理后台

- 本版27个已交叉核对的事件名称，目录有限，不代表全部历史事件；依据不足的候选未发布。
- `data/catalog.json`仅包含名称、别名与检索所需编目字段；`data/catalog.lock.json`锁定本版数量、版本和SHA-256摘要。
- 目录始终从源码读取，不读取旧版可编辑目录表，公众只能获得ID与事件名称。
- 已移除管理页面、目录编辑接口、审核发布功能及更正表单。`/admin`、`/api/admin`、`/corrections`与`/api/v1/corrections`返回404，事件接口的写入方法返回405。
- 资料来源和自写核对笔记另行保留，未随本公开仓库发布；没有扫描件、史料照片、文章复制和伤亡数字。
- “禁止修改”指网站运行时不存在内容编辑能力。源码所有者仍能发布新版本；确需更正时，应重新核对、审查修改、更新发布锁，再发布。
- 点烛记录继续正常新增，与固定事件目录分开处理。

## 每日点烛

按北京时间自然日，每个匿名浏览器一次；数据库唯一约束、原子批处理与请求幂等保证重复提交不会重复计数。统计表示有效点烛次数，不是真实独立人数。

GitHub Pages使用随机匿名标识、必要的第一方浏览器存储与受限来源的跨站API，不依赖第三方Cookie。服务器只保存标识的SHA-256摘要。直接访问备用站点使用HttpOnly第一方Cookie。清除存储、无痕模式、跨设备或跨站点来源会产生不同身份；多人共用浏览器共用当日资格。

前台不提供任何人的点击名单、浏览器标识或记录修改入口。

## 本地运行

需要Node.js 22.13或以上。

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_stiff_iron_fist.sql
npm run dev
```

打开 http://127.0.0.1:5173/ 。已有本地数据库时无需重复执行初始迁移；开发数据与线上D1完全分开。

只构建GitHub Pages前台：

```sh
npm run check
npm test
npm run build:pages
```

输出在`dist-pages/`。可用`npm run dev:pages`预览前台；默认连接已发布的点烛服务，检验点烛写入时只在本机服务上操作。支持`VITE_CANDLE_API_ORIGIN`和`VITE_PAGES_BASE`覆盖预览配置。更换前台域名时同步审查`lib/public-api.ts`的精确来源白名单。

## 发布

`.github/workflows/pages.yml`在推送`main`时执行类型检查、业务测试、前台构建并发布GitHub Pages。工作流动作固定到官方提交，不包含平台账号凭据。仓库Pages发布来源应设置为GitHub Actions。

此工作流只发布前台；点烛服务源码修改需要通过Sites另行构建并发布同一站点。服务绑定为`DB`，由`.openai/hosting.json`声明；运行时`SITE_ORIGIN`为备用站点精确来源。该清单中已有站点ID，其他使用者部署自己的站点时必须换成自己的站点配置，不能覆盖原站。

历史迁移保留原始校验值，不删除旧数据表和真实点烛记录；旧目录表不再参与查询。新服务不包含管理鉴权或管理写入代码。

## 验证与回退

`npm test`验证发布锁、只读目录、完整分页、繁体搜索、北京时间零点、每日唯一约束、跨日幂等及跨站来源边界。`node tests/http-check.mjs`仅允许本机地址，会产生明确用途的本地测试记录，覆盖100个同浏览器并发、后台404、内容写入405和无第三方Cookie的点烛流程。

保留发布提交、Pages部署记录、上一服务版本，以及点烛、访客摘要和幂等请求表备份。回退前台可回退GitHub源码提交并重新运行Pages；服务回退使用Sites已保存版本。不得通过回滚旧版重新引入被移除的后台；发布前需重新检查旧路由为404。

## 素材

纪念文案、CSS蜡烛与SVG山河图形为本项目制作。通用图标采用Lucide，许可见`public/third-party-notices.txt`。使用设备系统字体，不分发字体文件。
