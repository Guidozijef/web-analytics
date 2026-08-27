# Web Tracing System - 前端埋点数据收集与可视化分析系统

基于 **Cloudflare Workers + Hono + D1 Database** 边缘计算与 **Vue 3 + TypeScript + Vite + Tailwind CSS + ECharts** 技术栈构建的前端埋点数据收集服务与可视化管理后台，原生支持部署至 **Cloudflare**。

---

## 🌟 核心特性 (Features)

1. **高性能边缘收集后端 (Hono + Cloudflare Worker)**:
   - 使用 Hono 轻量框架构建 RESTful API。
   - 依赖 **Cloudflare D1 (SQLite Edge DB)** 进行毫秒级写入与大盘聚合查询。
   - 自动提取 Cloudflare Edge 节点的 IP、国家/地区地理位置信息。
   - 接入 CORS 安全防护与参数化查询防 SQL 注入。

2. **轻量级前端埋点 SDK (`@web-analyze/sdk`)**:
   - **自动 PV/UV 监测**: 兼容多页及 SPA (History API & Hash 路由变化)。
   - **无侵入点击埋点**: 声明 `data-track="button_id"` 即可零代码拦截收集。
   - **自动异常监控**: 捕获全局 JS 报错及 `Unhandled Promise Rejection` 错误堆栈。
   - **Web Vitals 性能采集**: 自动监测 FP, FCP, DOM Ready 及页面 Load 耗时。
   - **非阻塞上报**: 优先使用 `navigator.sendBeacon`，优雅回退至 `fetch keepalive`。

3. **现代 Vue 3 数据分析后台 (Analytics Dashboard)**:
   - **Vue 3 Composition API (`<script setup lang="ts">`) + Vite + Tailwind CSS**。
   - **ECharts 可视化图表**: PV/UV 趋势折线图、浏览器/操作系统占比饼图。
   - **日志明细检索**: 支持根据事件类型、关键字快速筛选日志，内置 JSON 格式化弹窗。
   - **异常报错监控专区**: 分屏查看错误列表与 Stack Trace 堆栈追溯。
   - **在线模拟埋点测试**: 提供实时交互测试按钮，可向后端直接注入测试数据。

---

## 📁 目录结构 (Repository Layout)

```
web-tracing-server/
├── packages/
│   ├── collector/      # Hono + Cloudflare Worker 后端 API 与 D1 交互
│   │   ├── src/
│   │   │   ├── db/     # D1 数据库 Client 与 SQL 参数化绑定
│   │   │   ├── routes/ # /track (收集) 与 /stats (统计分析) 路由
│   │   │   └── index.ts
│   │   ├── schema.sql  # D1 建表与索引初始化文件
│   │   └── wrangler.jsonc # Cloudflare 配置文件
│   ├── sdk/            # Web Tracing 埋点 SDK (TypeScript)
│   │   └── src/
│   │       ├── core/   # 核心 Tracker 与 Beacon 上报
│   │       └── plugins/# PV、Click、Error、Performance 插件
│   └── dashboard/      # Vue 3 Analytics 数据分析后台
│       └── src/
│           ├── views/  # Overview, Events, Errors, SdkGuide 视图
│           └── composables/ # useOverview, useEvents 数据流
├── package.json        # Workspace 根配置与命令封装
└── README.md
```

---

## 🚀 本地开发与测试 (Local Development)

### 1. 安装项目依赖

```bash
npm install
```

### 2. 初始化本地 Cloudflare D1 数据库

使用 Wrangler 在本地模拟创建一个 SQLite / D1 数据库并导入表结构：

```bash
npm --prefix packages/collector run d1:init:local
```

### 3. 启动后端收集 API (Hono Worker)

```bash
npm run dev:collector
```

后端服务将运行在 `http://127.0.0.1:8787`。

### 4. 启动 Vue 3 数据分析后台 (Dashboard)

在新的终端窗口中运行：

```bash
npm run dev:dashboard
```

前端后台将运行在 `http://localhost:5173`。访问页面后可进入 **SDK 接入指引** 页面点击“在线实时模拟埋点测试”按钮，体验数据的实时生成与图标渲染。

---

## ☁️ 部署至 Cloudflare (Cloudflare Deployment)

项目全套支持部署至 **Cloudflare Workers + D1 + Worker Static Assets**。

### 第一步：在 Cloudflare 创建线上 D1 数据库

执行 Cloudflare CLI 命令创建一个名为 `web-tracing-db` 的 D1 数据库：

```bash
npx wrangler d1 create web-tracing-db
```

终端将打印类似如下的配置：

```json
{
  "binding": "DB",
  "database_name": "web-tracing-db",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

请将返回的 `database_id` 填入 `packages/collector/wrangler.jsonc` 文件中的 `database_id` 字段。

### 第二步：执行线上数据库 Schema 初始化

```bash
npm --prefix packages/collector run d1:init:remote
```

### 第三步：一键打包并部署至 Cloudflare Edge

```bash
npm run deploy
```

部署完成后，Cloudflare Wrangler 将输出包含 API 与 Vue 3 管理后台的统一 Worker URL (如 `https://web-tracing-collector.<your-subdomain>.workers.dev`)，即可直接在线访问！

---

## 💡 前端 SDK 集成示例 (SDK Quickstart)

在任何 HTML / Vue / React 应用中引入 `@web-analyze/sdk`：

```typescript
import WebTracing from "@web-analyze/sdk";

// 1. 初始化 SDK
WebTracing.init({
  appId: "my-web-app",
  requestUrl: "https://web-tracing-collector.<your-subdomain>.workers.dev/api/v1/track",
  autoPV: true,
  autoClick: true,
  autoError: true,
  autoPerformance: true,
});

// 2. HTML 声明式点击埋点
// <button data-track="pay_button" data-track-params='{"amount": 100}'>立即支付</button>

// 3. 手动触发自定义事件
WebTracing.track("custom_event_name", { userId: "12345" });
```
