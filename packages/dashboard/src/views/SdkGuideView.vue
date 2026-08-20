<script setup lang="ts">
import { ref } from 'vue';
import { Code, Check, Play, AlertCircle, Sparkles } from 'lucide-vue-next';

const copied = ref(false);
const testStatus = ref('');

const sdkSnippet = `// 1. 在前端应用中引入 Web Tracing SDK
import WebTracing from '@web-tracing/sdk';

// 2. 在应用入口 (如 main.ts 或 index.js) 初始化 SDK
WebTracing.init({
  appId: 'default-app', // 你的应用唯一 ID
  requestUrl: 'https://<your-worker>.workers.dev/api/v1/track', // 部署后的 Worker 上报地址
  autoPV: true,          // 自动监听页面切换 PV
  autoClick: true,       // 自动监听带有 data-track 属性的按钮点击
  autoError: true,       // 自动监听 JS 全局报错与 Unhandled Promise Rejection
  autoPerformance: true  // 自动上报 Web Vitals 性能数据
});

// 3. 手动触发自定义业务埋点 (可选)
WebTracing.track('order_payment_success', {
  order_id: 'ORD_998822',
  amount: 299.00
});`;

const copyCode = () => {
  navigator.clipboard.writeText(sdkSnippet);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

// 触发在线模拟埋点测试
const triggerTestEvent = async (type: 'pageview' | 'click' | 'error' | 'custom') => {
  testStatus.value = '发送测试埋点中...';
  try {
    let payload = {};
    const now = Date.now();
    const sessionId = 'test_sess_' + Math.random().toString(36).substring(2, 8);
    const visitorId = 'test_vis_' + Math.random().toString(36).substring(2, 8);

    if (type === 'pageview') {
      payload = {
        app_id: 'default-app',
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: 'pageview',
        event_name: 'page_view',
        page_url: 'http://localhost:5173/dashboard/overview',
        page_title: '模拟页面测试',
        timestamp: now,
      };
    } else if (type === 'click') {
      payload = {
        app_id: 'default-app',
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: 'click',
        event_name: 'button_buy_now',
        page_url: 'http://localhost:5173/product/101',
        page_title: '商品详情页',
        params: { product_id: 101, button_name: '立即购买' },
        timestamp: now,
      };
    } else if (type === 'error') {
      payload = {
        app_id: 'default-app',
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: 'error',
        event_name: 'js_error',
        page_url: 'http://localhost:5173/checkout',
        page_title: '结算页面',
        params: {
          message: 'TypeError: Cannot read properties of undefined (reading "user_id")',
          stack: 'TypeError: Cannot read properties of undefined\n    at checkout (http://localhost:5173/src/checkout.ts:42:15)',
        },
        timestamp: now,
      };
    } else {
      payload = {
        app_id: 'default-app',
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: 'custom',
        event_name: 'user_login',
        page_url: 'http://localhost:5173/login',
        page_title: '用户登录页',
        params: { login_method: 'wechat', user_role: 'vip' },
        timestamp: now,
      };
    }

    const res = await fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      testStatus.value = `✅ [${type}] 模拟测试事件已成功上报并写入 Cloudflare D1！请前往大盘或日志页查看。`;
    } else {
      testStatus.value = `❌ 上报失败，状态码: ${res.status}`;
    }
  } catch (err: any) {
    testStatus.value = `❌ 模拟请求出错: ${err.message}`;
  }
};
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
        <Sparkles class="w-6 h-6 text-indigo-400" />
        <span>SDK 快速接入与调试指南</span>
      </h1>
      <p class="text-xs text-slate-400 mt-1">仅需 3 行代码即可将前端埋点监控无缝集成至任何前端项目 (Vue / React / HTML / Uniapp)</p>
    </div>

    <!-- 在线埋点模拟测试调试区 -->
    <div class="glass-panel p-6 border border-indigo-500/30">
      <h3 class="text-sm font-bold text-slate-100 mb-2 flex items-center space-x-2">
        <Play class="w-4 h-4 text-emerald-400" />
        <span>在线实时模拟埋点测试 (Live Testing)</span>
      </h3>
      <p class="text-xs text-slate-400 mb-4">点击下方按钮可向后端收集服务直接投递模拟测试数据，验证 D1 数据库写入与可视化图表渲染：</p>

      <div class="flex flex-wrap gap-3 mb-4">
        <button
          @click="triggerTestEvent('pageview')"
          class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
        >
          <span>发送模拟 PV 事件</span>
        </button>

        <button
          @click="triggerTestEvent('click')"
          class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
        >
          <span>发送模拟按钮点击</span>
        </button>

        <button
          @click="triggerTestEvent('error')"
          class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
        >
          <span>发送模拟 JS 报错</span>
        </button>

        <button
          @click="triggerTestEvent('custom')"
          class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
        >
          <span>发送模拟自定义事件</span>
        </button>
      </div>

      <div v-if="testStatus" class="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
        {{ testStatus }}
      </div>
    </div>

    <!-- 代码集成卡片 -->
    <div class="glass-panel p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <Code class="w-4 h-4 text-indigo-400" />
          <span>TypeScript / JavaScript 集成代码</span>
        </h3>
        <button
          @click="copyCode"
          class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
        >
          <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
          <Code v-else class="w-3.5 h-3.5" />
          <span>{{ copied ? '已复制到剪贴板' : '复制代码' }}</span>
        </button>
      </div>

      <pre class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto leading-relaxed select-all">{{ sdkSnippet }}</pre>
    </div>

    <!-- HTML data-track 无侵入标记规范 -->
    <div class="glass-panel p-6">
      <h3 class="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
        <AlertCircle class="w-4 h-4 text-amber-400" />
        <span>HTML 无侵入式点击埋点标记说明</span>
      </h3>
      <p class="text-xs text-slate-400 mb-3">使用 SDK 后，无需编写额外 JavaScript 代码，仅需在页面元素添加 <code class="text-amber-300 font-mono">data-track</code> 属性即可自动收集用户点击行为：</p>
      
      <pre class="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">&lt;!-- 普通按钮点击埋点 --&gt;
&lt;button data-track="submit_form_btn"&gt;提交订单&lt;/button&gt;

&lt;!-- 附带额外扩展参数的点击埋点 --&gt;
&lt;button data-track="banner_click" data-track-params='{"banner_id": 88, "pos": "header"}'&gt;
  点击 Banner
&lt;/button&gt;</pre>
    </div>
  </div>
</template>

<style scoped>
</style>
