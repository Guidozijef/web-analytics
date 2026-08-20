<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAppId } from '../composables/useAppId';
import { fetchEvents, EventItem } from '../api/stats';
import { AlertOctagon, Terminal, Clock, RefreshCw } from 'lucide-vue-next';

const { currentAppId } = useAppId();
const loading = ref(false);
const errorLogs = ref<EventItem[]>([]);
const activeError = ref<EventItem | null>(null);

const loadErrors = async () => {
  loading.value = true;
  try {
    const res = await fetchEvents(currentAppId.value, 'error', '', undefined, 1, 50);
    errorLogs.value = res.list || [];
    if (errorLogs.value.length > 0) {
      activeError.value = errorLogs.value[0];
    } else {
      activeError.value = null;
    }
  } catch (err) {
    console.error('加载报错日志失败:', err);
  } finally {
    loading.value = false;
  }
};

const parseErrorParams = (paramsStr: string) => {
  try {
    return JSON.parse(paramsStr);
  } catch {
    return { raw: paramsStr };
  }
};

watch(currentAppId, () => {
  loadErrors();
});

onMounted(() => {
  loadErrors();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <AlertOctagon class="w-7 h-7 text-rose-500" />
          <span>异常报错监控 Error Tracker</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">前端全局捕获到的 JavaScript 运行时错误及 Unhandled Rejection 堆栈</p>
      </div>

      <button
        @click="loadErrors"
        :disabled="loading"
        class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-all"
      >
        <RefreshCw :class="['w-4 h-4', { 'animate-spin': loading }]" />
        <span>刷新列表</span>
      </button>
    </div>

    <!-- 主体左右 Split 面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 左侧报错日志列表 (4 cols) -->
      <div class="lg:col-span-4 glass-panel p-4 flex flex-col h-[720px]">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">报错日志列表 (最近 50 条)</h3>
        
        <div class="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div v-if="loading" class="text-center py-12 text-xs text-slate-500">
            加载错误列表中...
          </div>
          <div v-else-if="errorLogs.length === 0" class="text-center py-12 text-xs text-slate-500">
            未发现运行报错记录
          </div>
          <div
            v-for="item in errorLogs"
            :key="item.id"
            @click="activeError = item"
            :class="[
              'p-3 rounded-lg border text-left cursor-pointer transition-all',
              activeError?.id === item.id
                ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-lg'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            ]"
          >
            <div class="flex items-center justify-between mb-1 text-xs">
              <span class="font-semibold text-rose-400 truncate max-w-[180px]">
                {{ item.event_name }}
              </span>
              <span class="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                <Clock class="w-3 h-3" />
                <span>{{ new Date(item.timestamp).toLocaleTimeString() }}</span>
              </span>
            </div>

            <div class="text-xs text-slate-200 font-medium truncate mb-1">
              {{ parseErrorParams(item.params).message || '未知错误信息' }}
            </div>

            <div class="text-[10px] text-slate-500 font-mono truncate">
              {{ item.page_url }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧报错堆栈详情 (8 cols) -->
      <div class="lg:col-span-8 glass-panel p-6 flex flex-col h-[720px]">
        <div v-if="!activeError" class="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Terminal class="w-12 h-12 mb-3 text-slate-700" />
          <span>请在左侧选择一条报错记录查看详细 Stack Trace 堆栈信息</span>
        </div>

        <div v-else class="flex-1 flex flex-col space-y-5 overflow-y-auto">
          <!-- 头部 Summary -->
          <div class="bg-slate-950 p-4 rounded-xl border border-rose-500/30">
            <div class="flex items-center space-x-2 mb-2">
              <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                {{ activeError.event_name }}
              </span>
              <h2 class="text-base font-bold text-slate-100">
                {{ parseErrorParams(activeError.params).message || '未指定 Error Message' }}
              </h2>
            </div>
            <div class="text-xs font-mono text-slate-400 break-all">
              页面: {{ activeError.page_url }}
            </div>
          </div>

          <!-- 设备环境元数据 -->
          <div class="grid grid-cols-3 gap-3 text-xs">
            <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div class="text-slate-500 mb-1">浏览器</div>
              <div class="text-slate-200 font-medium">{{ activeError.browser }}</div>
            </div>
            <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div class="text-slate-500 mb-1">操作系统</div>
              <div class="text-slate-200 font-medium">{{ activeError.os }}</div>
            </div>
            <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div class="text-slate-500 mb-1">发生时间</div>
              <div class="text-slate-200 font-medium">{{ new Date(activeError.timestamp).toLocaleString() }}</div>
            </div>
          </div>

          <!-- Stack Trace 堆栈视口 -->
          <div class="flex-1 flex flex-col min-h-0">
            <div class="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-2">
              <Terminal class="w-4 h-4 text-indigo-400" />
              <span>Stack Trace 错误堆栈信息:</span>
            </div>
            <pre class="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-rose-300 overflow-auto leading-relaxed select-text">{{ parseErrorParams(activeError.params).stack || parseErrorParams(activeError.params).message || '无完整 Stack Trace 追溯信息' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
