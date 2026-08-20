<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { EventItem } from '../../api/stats';
import { Eye, Clock, Monitor, Globe, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Copy, Check, X, User } from 'lucide-vue-next';

const props = defineProps<{
  events: EventItem[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: 'page-change', page: number): void;
  (e: 'page-size-change', pageSize: number): void;
}>();

const activeModalEvent = ref<EventItem | null>(null);
const copiedParams = ref(false);

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1);

const formatDate = (ts: number) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getBadgeStyle = (type: EventItem['event_type'], eventName?: string) => {
  if (eventName === 'api_request') {
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  }
  switch (type) {
    case 'pageview':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'click':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'error':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'performance':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }
};

const parseParamsJson = (paramsStr: string) => {
  try {
    return JSON.stringify(JSON.parse(paramsStr), null, 2);
  } catch {
    return paramsStr || '{}';
  }
};

const copyParams = () => {
  if (!activeModalEvent.value) return;
  const content = parseParamsJson(activeModalEvent.value.params);
  navigator.clipboard.writeText(content);
  copiedParams.value = true;
  setTimeout(() => (copiedParams.value = false), 2000);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && activeModalEvent.value) {
    activeModalEvent.value = null;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="glass-panel overflow-hidden flex flex-col">
    <!-- 数据表格 -->
    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left text-sm text-slate-300">
        <thead class="bg-slate-900/90 text-xs uppercase text-slate-400 border-b border-slate-800">
          <tr>
            <th class="px-4 py-3 font-medium">事件类型</th>
            <th class="px-4 py-3 font-medium">事件名称</th>
            <th class="px-4 py-3 font-medium">登录用户</th>
            <th class="px-4 py-3 font-medium">页面 URL / 标题</th>
            <th class="px-4 py-3 font-medium">环境信息 (Browser/OS)</th>
            <th class="px-4 py-3 font-medium">触发时间</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="py-16 text-slate-500">
              <div class="inline-flex items-center space-x-2">
                <span class="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
                <span>数据加载中...</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="events.length === 0" class="text-center">
            <td colspan="7" class="py-16 text-slate-500">
              暂无符合条件的埋点日志记录
            </td>
          </tr>
          <tr
            v-for="item in events"
            :key="item.id"
            class="hover:bg-slate-850/60 transition-colors"
          >
            <td class="px-4 py-3.5 whitespace-nowrap">
              <span
                :class="['px-2.5 py-1 text-xs font-semibold rounded-md border', getBadgeStyle(item.event_type, item.event_name)]"
              >
                {{ item.event_type }}
              </span>
            </td>
            <td class="px-4 py-3.5 font-medium text-slate-100 whitespace-nowrap">
              {{ item.event_name }}
            </td>
            <td class="px-4 py-3.5 whitespace-nowrap text-xs">
              <div v-if="item.user_name || item.user_id" class="flex items-center space-x-1 text-slate-200 font-medium">
                <User class="w-3.5 h-3.5 text-indigo-400" />
                <span>{{ item.user_name || item.user_id }}</span>
              </div>
              <span v-else class="text-slate-500 font-mono text-[11px]">- 匿名 -</span>
              <div v-if="item.user_id && item.user_name && item.user_id !== item.user_name" class="text-[10px] text-slate-500 font-mono">
                ID: {{ item.user_id }}
              </div>
            </td>
            <td class="px-4 py-3.5 max-w-xs truncate">
              <div class="text-slate-200 font-medium truncate">{{ item.page_title || item.page_url }}</div>
              <div class="text-xs text-slate-500 truncate font-mono">{{ item.page_url }}</div>
            </td>
            <td class="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
              <div class="flex items-center space-x-1.5">
                <Monitor class="w-3.5 h-3.5 text-slate-500" />
                <span>{{ item.browser || 'Unknown' }}</span>
              </div>
              <div class="text-slate-500 mt-0.5">{{ item.os }}</div>
            </td>
            <td class="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
              <div class="flex items-center space-x-1.5">
                <Clock class="w-3.5 h-3.5 text-slate-500" />
                <span>{{ formatDate(item.timestamp) }}</span>
              </div>
            </td>
            <td class="px-4 py-3.5 whitespace-nowrap text-right text-xs">
              <button
                @click="activeModalEvent = item"
                class="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 transition-all inline-flex items-center space-x-1 font-medium"
              >
                <Eye class="w-3.5 h-3.5" />
                <span>查看详情</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 高级分页控制条 (Pagination Controls Bar) -->
    <div class="px-5 py-3.5 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
      <!-- 左侧：总数与每页条数选择器 -->
      <div class="flex items-center space-x-4">
        <span>共 <strong class="text-slate-100 font-semibold">{{ total }}</strong> 条日志</span>
        
        <div class="flex items-center space-x-1.5">
          <label class="text-slate-400">每页显示:</label>
          <select
            :value="pageSize"
            @change="emit('page-size-change', parseInt(($event.target as HTMLSelectElement).value, 10))"
            class="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option :value="10">10 条/页</option>
            <option :value="20">20 条/页</option>
            <option :value="50">50 条/页</option>
            <option :value="100">100 条/页</option>
          </select>
        </div>
      </div>

      <!-- 右侧：页码翻页按钮 -->
      <div class="flex items-center space-x-1">
        <!-- 首页 -->
        <button
          :disabled="page <= 1 || loading"
          @click="emit('page-change', 1)"
          title="首页"
          class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
        >
          <ChevronsLeft class="w-4 h-4" />
        </button>

        <!-- 上一页 -->
        <button
          :disabled="page <= 1 || loading"
          @click="emit('page-change', page - 1)"
          title="上一页"
          class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <!-- 当前页码 / 总页数 -->
        <div class="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-medium font-mono">
          {{ page }} / {{ totalPages }}
        </div>

        <!-- 下一页 -->
        <button
          :disabled="page >= totalPages || loading"
          @click="emit('page-change', page + 1)"
          title="下一页"
          class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>

        <!-- 末页 -->
        <button
          :disabled="page >= totalPages || loading"
          @click="emit('page-change', totalPages)"
          title="末页"
          class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
        >
          <ChevronsRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 修复后的详情 JSON 弹窗 Modal (包含扩展元数据与用户凭证) -->
    <Teleport to="body">
      <div
        v-if="activeModalEvent"
        @click.self="activeModalEvent = null"
        class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto"
      >
        <div
          class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[88vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative"
        >
          <!-- 弹窗 Header (固定不滚动) -->
          <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
            <div class="flex items-center space-x-3">
              <span
                :class="['px-3 py-1 text-xs font-semibold rounded-md border', getBadgeStyle(activeModalEvent.event_type)]"
              >
                {{ activeModalEvent.event_type }}
              </span>
              <div>
                <h3 class="text-lg font-bold text-slate-100">{{ activeModalEvent.event_name }}</h3>
                <span class="text-xs text-slate-400 font-mono">ID: #{{ activeModalEvent.id }}</span>
              </div>
            </div>

            <button
              @click="activeModalEvent = null"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- 弹窗 Body (内部支持纵向独立滚动) -->
          <div class="px-6 py-5 overflow-y-auto flex-1 space-y-5 text-slate-200">
            <!-- 基础标识与用户信息 (4 列网格) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div class="bg-slate-950 p-3 rounded-xl border border-indigo-500/30">
                <div class="text-indigo-400 mb-1 flex items-center space-x-1 font-semibold">
                  <User class="w-3.5 h-3.5" />
                  <span>当前登录用户</span>
                </div>
                <div class="text-slate-100 font-bold truncate">
                  {{ activeModalEvent.user_name || activeModalEvent.user_id || '未登录/匿名用户' }}
                </div>
                <div v-if="activeModalEvent.user_id" class="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                  ID: {{ activeModalEvent.user_id }}
                </div>
              </div>

              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div class="text-slate-500 mb-1">Visitor ID (访客设备)</div>
                <div class="text-slate-200 font-mono font-medium truncate" :title="activeModalEvent.visitor_id">
                  {{ activeModalEvent.visitor_id }}
                </div>
              </div>

              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div class="text-slate-500 mb-1">Session ID (会话周期)</div>
                <div class="text-slate-200 font-mono font-medium truncate" :title="activeModalEvent.session_id">
                  {{ activeModalEvent.session_id }}
                </div>
              </div>

              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div class="text-slate-500 mb-1">触发时间与地区</div>
                <div class="text-slate-200 font-medium flex items-center justify-between">
                  <span class="flex items-center space-x-1 text-emerald-400 font-mono">
                    <Clock class="w-3.5 h-3.5" />
                    <span>{{ formatDate(activeModalEvent.timestamp) }}</span>
                  </span>
                  <span class="flex items-center space-x-1 text-indigo-400 font-mono">
                    <Globe class="w-3.5 h-3.5" />
                    <span>{{ activeModalEvent.country || 'CN' }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 客户端环境与 UA 独立区块卡片 (结构化大卡片) -->
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 text-xs">
              <div class="text-xs font-semibold text-slate-300 flex items-center space-x-2 border-b border-slate-850 pb-2">
                <Monitor class="w-4 h-4 text-indigo-400" />
                <span>客户端设备与环境详细元数据 (Environment & User-Agent)</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span class="text-slate-500 block mb-0.5">浏览器环境</span>
                  <span class="text-slate-200 font-semibold font-mono">{{ activeModalEvent.browser || 'Unknown Browser' }}</span>
                </div>
                <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span class="text-slate-500 block mb-0.5">操作系统</span>
                  <span class="text-slate-200 font-semibold font-mono">{{ activeModalEvent.os || 'Unknown OS' }}</span>
                </div>
                <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span class="text-slate-500 block mb-0.5">设备类型</span>
                  <span class="text-slate-200 font-semibold capitalize font-mono">{{ activeModalEvent.device || 'desktop' }}</span>
                </div>
              </div>

              <!-- UA 原始字符串 (全长换行自适应展示) -->
              <div>
                <div class="text-[11px] font-semibold text-slate-400 mb-1">User-Agent 原始字符串 (UA String):</div>
                <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-text leading-relaxed">
                  {{ activeModalEvent.user_agent || '客户端未上报 User-Agent 标头' }}
                </div>
              </div>
            </div>

            <!-- 页面标题与完整 URL -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 md:col-span-1">
                <div class="text-slate-500 mb-1">页面标题 (Page Title)</div>
                <div class="text-slate-200 font-medium truncate">
                  {{ activeModalEvent.page_title || '-' }}
                </div>
              </div>

              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 md:col-span-2">
                <div class="text-slate-500 mb-1">完整 URL 路径 (Page URL)</div>
                <div class="text-xs font-mono text-indigo-300 break-all select-text">
                  {{ activeModalEvent.page_url || '-' }}
                </div>
              </div>
            </div>

            <!-- Params JSON 与 Stack Trace 扩展参数代码快照 -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="text-xs font-semibold text-slate-400">事件扩展 Payload 参数 (富环境元数据与自定义维度)</div>
                <button
                  @click="copyParams"
                  class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center space-x-1"
                >
                  <Check v-if="copiedParams" class="w-3.5 h-3.5 text-emerald-400" />
                  <Copy v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedParams ? '已复制 JSON' : '复制 JSON' }}</span>
                </button>
              </div>

              <pre class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-80 overflow-y-auto select-all">{{ parseParamsJson(activeModalEvent.params) }}</pre>
            </div>
          </div>

          <!-- 弹窗 Footer (固定不滚动) -->
          <div class="px-6 py-4 border-t border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
            <span class="text-xs text-slate-500 font-mono">按 Esc 键或点击背景遮罩可快速关闭</span>
            <button
              @click="activeModalEvent = null"
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              关闭窗口
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
</style>
