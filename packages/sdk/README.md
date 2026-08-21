# @web-tracing/sdk

🚀 **轻量级、无侵入、高性能的前端全自动埋点与性能/接口/报错监控 SDK**

提供 Vue / React / HTML 网页的全自动路由 PV/UV 监控、 Element Plus / 通用点击事件拦截、业务 HTTP 接口监听与全量参数捕获、JavaScript 运行时报错追踪及 Web Vitals 性能分析。

采用 **工业级异步批量事件队列与定时/空闲上报引擎**，绝对不阻塞任何现有的业务 API 请求与页面渲染！

---

## 📦 安装 (Installation)

```bash
npm install @web-tracing/sdk
# 或
pnpm add @web-tracing/sdk
# 或
yarn add @web-tracing/sdk
```

---

## ⚡ 快速接入 (Quick Start)

在项目入口文件（例如 `main.ts` / `main.js` 或 Vue 插件）中快速初始化：

```typescript
import WebTracing from '@web-tracing/sdk';

// 在应用挂载完成后启用 SDK
WebTracing.init({
  appId: 'my-web-app', // 在控制台注册的 App ID
  requestUrl: 'https://web-tracing-collector.your-domain.workers.dev/api/v1/track', // 上报接口地址
  autoPV: true,          // 自动监听 PV/UV 路由切换
  autoClick: true,       // 自动监听按钮与 Element Plus 组件点击
  autoError: true,       // 自动监听全局 JS 报错与 Promise Rejection
  autoPerformance: true, // 自动上报 Web Vitals 性能数据
  autoApi: true,         // 自动监听业务 HTTP 接口请求及全量参数
  
  // (可选) 动态关联当前系统登录的用户信息
  getUser: () => {
    return {
      userId: '10086',
      userName: '张三',
    };
  },
});
```

---

## ⚙️ 核心配置参数 (Options)

| 参数项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `appId` | `string` | **必填** | 应用在监控平台中注册的唯一 App ID |
| `requestUrl` | `string` | `'/api/v1/track'` | 接收埋点上报的后端 API 地址 |
| `autoPV` | `boolean` | `true` | 是否开启路由 PV/UV 自动收集 |
| `autoClick` | `boolean` | `true` | 是否开启按钮与 Element Plus 交互点击自动收集 |
| `autoError` | `boolean` | `true` | 是否开启全局 JS 异常与 Promise Rejection 自动捕获 |
| `autoPerformance` | `boolean` | `true` | 是否开启 FP/FCP/LCP/CLS 性能数据自动收集 |
| `autoApi` | `boolean` | `true` | 是否开启业务 HTTP 接口请求与参数自动监听 |
| `getUser` | `Function` | `() => ({})` | 动态返回当前登录用户 `userId` 与 `userName` 的回调 |
| `maxQueueSize` | `number` | `10` | 批量异步队列上限容量，达到该条数自动上报 |
| `flushInterval` | `number` | `5000` | 后台定时清空队列上报的时间间隔 (毫秒) |

---

## 🛠️ 常用 API 方法

### 1. 手动设置登录用户标识

用户登录成功后显式设置用户：
```typescript
import { setUser, clearUser } from '@web-tracing/sdk';

// 登录成功时
setUser({ userId: '10086', userName: '张三' });

// 退出登录时
clearUser();
```

### 2. 手动触发自定义事件

```typescript
import { track } from '@web-tracing/sdk';

track('submit_form', {
  form_name: '用户报销申请',
  amount: 500,
});
```

### 3. 手动强行冲刷队列上报

```typescript
import { flush } from '@web-tracing/sdk';

// 强制立即发送当前内存队列中的全量事件
flush();
```

---

## 📄 License

MIT
