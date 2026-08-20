<script setup lang="ts">
import { useRoute } from "vue-router";
import { useAppId } from "./composables/useAppId";
import { LayoutDashboard, ListFilter, AlertOctagon, Code, Activity, Layers, Settings } from "lucide-vue-next";

const route = useRoute();
const { currentAppId, appList } = useAppId();

const navItems = [
  { name: "大盘概览", path: "/overview", icon: LayoutDashboard },
  { name: "埋点明细", path: "/events", icon: ListFilter },
  { name: "异常监控", path: "/errors", icon: AlertOctagon },
  { name: "项目应用配置", path: "/apps", icon: Settings },
  { name: "SDK 接入指引", path: "/guide", icon: Code },
];
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
    <!-- 左侧 Sidebar 导航栏 -->
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <!-- 品牌 Logo 标题 -->
      <div class="h-16 px-6 flex items-center space-x-3 border-b border-slate-800">
        <div class="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <Activity class="w-5 h-5" />
        </div>
        <div>
          <span class="text-base font-bold text-white tracking-wide">Web Tracing</span>
          <span class="block text-[10px] text-slate-400 font-mono">Cloudflare + Vue 3</span>
        </div>
      </div>

      <!-- 应用隔离 Selector (动态渲染注册表中的应用) -->
      <div class="p-4 border-b border-slate-800/80">
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
          <Layers class="w-3 h-3 text-indigo-400" />
          <span>当前项目 App ID</span>
        </label>
        <select v-model="currentAppId" class="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono">
          <option v-for="app in appList" :key="app.app_id" :value="app.app_id">
            {{ app.name }} ({{ app.app_id }})
          </option>
        </select>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" :class="['flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all', route.path === item.path ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60']">
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- 底部状态栏 -->
      <div class="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span class="flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>D1 Live Engine</span>
        </span>
        <span class="font-mono text-slate-400">v1.0.0</span>
      </div>
    </aside>

    <!-- 右侧主内容视口 -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- 顶部 Header 栏 -->
      <header class="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-2 text-xs text-slate-400">
          <span>当前监控项目:</span>
          <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
            {{ currentAppId }}
          </span>
        </div>

        <div class="flex items-center space-x-4">
          <router-link to="/apps" class="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center space-x-1">
            <Settings class="w-3.5 h-3.5" />
            <span>项目配置管理</span>
          </router-link>
        </div>
      </header>

      <!-- 路由内容区 -->
      <main class="flex-1 overflow-y-auto p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped></style>
