<script setup lang="ts">
import { useEvents } from "../composables/useEvents";
import DataTable from "../components/common/DataTable.vue";
import { Search, RefreshCw, User, Calendar, RotateCcw } from "lucide-vue-next";

const { loading, events, total, page, pageSize, eventType, keyword, userId, startDate, endDate, search, resetFilters, refresh } = useEvents();

const eventTypeOptions = [
  { label: "全部类型", value: "all" },
  { label: "页面浏览 (pageview)", value: "pageview" },
  { label: "点击事件 (click)", value: "click" },
  { label: "接口请求 (api_request)", value: "api" },
  { label: "JS 报错 (error)", value: "error" },
  { label: "性能指标 (performance)", value: "performance" },
  { label: "自定义事件 (custom)", value: "custom" },
];

const handlePageChange = (newPage: number) => {
  page.value = newPage;
};

const handlePageSizeChange = (newPageSize: number) => {
  pageSize.value = newPageSize;
};

// 点击日期框任意区域时主动调用 HTML5 showPicker API 弹起日历窗口
const triggerShowPicker = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLInputElement;
  if (target && typeof target.showPicker === "function") {
    try {
      target.showPicker();
    } catch {}
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 标题与刷新控制栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">埋点事件明细 Events Log</h1>
        <p class="text-xs text-slate-400 mt-1">查看和检索全量上报数据，支持按时间范围、登录用户、事件大类及关键字精确筛选</p>
      </div>

      <div class="flex items-center space-x-3">
        <button @click="refresh" :disabled="loading" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-all">
          <RefreshCw :class="['w-4 h-4', { 'animate-spin': loading }]" />
          <span>刷新</span>
        </button>
      </div>
    </div>

    <!-- 过滤器面板 (多维度时间/用户/分类/关键字) -->
    <div class="glass-panel p-4 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        <!-- 1. 事件大类筛选 -->
        <div class="lg:col-span-3 flex items-center space-x-2">
          <label class="text-xs text-slate-400 whitespace-nowrap">事件类型:</label>
          <select v-model="eventType" class="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 w-full cursor-pointer">
            <option v-for="opt in eventTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- 2. 用户 ID / 用户名筛选 -->
        <div class="lg:col-span-3 relative">
          <input v-model="userId" @keyup.enter="search" type="text" placeholder="按用户 ID 或用户名筛选..." class="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500" />
          <User class="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <!-- 3. 时间范围选择器 (带 showPicker 显式唤起日历) -->
        <div class="lg:col-span-6 flex items-center space-x-2">
          <div class="relative flex-1">
            <input
              v-model="startDate"
              type="date"
              @click="triggerShowPicker"
              class="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 rounded-lg pl-8 pr-2 py-2 focus:outline-none focus:border-indigo-500 [color-scheme:dark] cursor-pointer transition-colors"
            />
            <Calendar class="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
          <span class="text-xs text-slate-500">至</span>
          <div class="relative flex-1">
            <input
              v-model="endDate"
              type="date"
              @click="triggerShowPicker"
              class="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 rounded-lg pl-8 pr-2 py-2 focus:outline-none focus:border-indigo-500 [color-scheme:dark] cursor-pointer transition-colors"
            />
            <Calendar class="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- 第二行：关键字与搜索/重置按钮 -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        <div class="relative w-full sm:w-96">
          <input v-model="keyword" @keyup.enter="search" type="text" placeholder="全文检索事件名、URL 路径或报错 Stack Trace..." class="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500" />
          <Search class="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button @click="resetFilters" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors">
            <RotateCcw class="w-3.5 h-3.5" />
            <span>重置条件</span>
          </button>
          <button @click="search" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-colors">查询结果</button>
        </div>
      </div>
    </div>

    <!-- 数据表格与详情 Modal -->
    <DataTable :events="events" :loading="loading" :total="total" :page="page" :pageSize="pageSize" @page-change="handlePageChange" @page-size-change="handlePageSizeChange" />
  </div>
</template>

<style scoped>
/* 保证 Chromium 内核日历图标高亮且鼠标可点击 */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.85);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
}
input[type="date"]::-webkit-calendar-picker-indicator:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
