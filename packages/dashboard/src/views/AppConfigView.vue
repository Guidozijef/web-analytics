<script setup lang="ts">
import { ref } from 'vue';
import { useAppId, AppItem } from '../composables/useAppId';
import { Plus, Edit2, Trash2, CheckCircle, Key, Layers, Calendar, X } from 'lucide-vue-next';

const { currentAppId, appList, addApp, updateApp, deleteApp, setCurrentAppId } = useAppId();

const isModalOpen = ref(false);
const isEditing = ref(false);
const errorMsg = ref('');

const formData = ref({
  app_id: '',
  name: '',
  api_key: '',
});

const openAddModal = () => {
  isEditing.value = false;
  formData.value = { app_id: '', name: '', api_key: '' };
  errorMsg.value = '';
  isModalOpen.value = true;
};

const openEditModal = (app: AppItem) => {
  isEditing.value = true;
  formData.value = { app_id: app.app_id, name: app.name, api_key: app.api_key };
  errorMsg.value = '';
  isModalOpen.value = true;
};

const handleSubmit = async () => {
  errorMsg.value = '';
  if (!formData.value.app_id.trim()) {
    errorMsg.value = '请输入 App ID 标识';
    return;
  }
  if (!formData.value.name.trim()) {
    errorMsg.value = '请输入应用名称';
    return;
  }

  try {
    if (isEditing.value) {
      await updateApp(formData.value.app_id, {
        name: formData.value.name,
        api_key: formData.value.api_key,
      });
    } else {
      await addApp({
        app_id: formData.value.app_id.trim(),
        name: formData.value.name.trim(),
        api_key: formData.value.api_key.trim(),
      });
    }
    isModalOpen.value = false;
  } catch (err: any) {
    errorMsg.value = err.message || '保存失败';
  }
};

const handleDelete = async (app_id: string) => {
  if (confirm(`确定要在 Cloudflare D1 数据库中删除项目 '${app_id}' 吗？`)) {
    try {
      await deleteApp(app_id);
    } catch (err: any) {
      alert(err.message);
    }
  }
};

const formatDate = (ts: number) => {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('zh-CN');
};
</script>

<template>
  <div class="space-y-6 max-w-6xl">
    <!-- 标题栏与新增按钮 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Layers class="w-7 h-7 text-indigo-400" />
          <span>项目应用配置 App Management</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">管理注册在 Web Tracing 监控服务中的应用与通信 Token 鉴权凭证</p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center space-x-1.5 transition-all w-fit"
      >
        <Plus class="w-4 h-4" />
        <span>新增项目应用</span>
      </button>
    </div>

    <!-- 应用项目列表 -->
    <div class="glass-panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-900/90 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-5 py-3.5 font-medium">应用状态</th>
              <th class="px-5 py-3.5 font-medium">App ID (项目标识)</th>
              <th class="px-5 py-3.5 font-medium">应用显示名称</th>
              <th class="px-5 py-3.5 font-medium">API Token / 通信密钥</th>
              <th class="px-5 py-3.5 font-medium">注册时间</th>
              <th class="px-5 py-3.5 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="app in appList"
              :key="app.app_id"
              :class="[
                'hover:bg-slate-850/60 transition-colors',
                currentAppId === app.app_id ? 'bg-indigo-600/5' : ''
              ]"
            >
              <td class="px-5 py-4 whitespace-nowrap">
                <span
                  v-if="currentAppId === app.app_id"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1"
                >
                  <CheckCircle class="w-3.5 h-3.5" />
                  <span>当前激活</span>
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-400 border border-slate-700"
                >
                  未选中
                </span>
              </td>
              <td class="px-5 py-4 font-mono font-semibold text-indigo-300 whitespace-nowrap">
                {{ app.app_id }}
              </td>
              <td class="px-5 py-4 font-medium text-slate-100 whitespace-nowrap">
                {{ app.name }}
              </td>
              <td class="px-5 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                <div class="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 w-fit">
                  <Key class="w-3.5 h-3.5 text-amber-400" />
                  <span>{{ app.api_key }}</span>
                </div>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                <div class="flex items-center space-x-1">
                  <Calendar class="w-3.5 h-3.5 text-slate-500" />
                  <span>{{ formatDate(app.created_at) }}</span>
                </div>
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right text-xs space-x-2">
                <button
                  v-if="currentAppId !== app.app_id"
                  @click="setCurrentAppId(app.app_id)"
                  class="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded transition-colors"
                >
                  切换到此项目
                </button>
                <button
                  @click="openEditModal(app)"
                  class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                  <Edit2 class="w-3.5 h-3.5 inline" />
                </button>
                <button
                  @click="handleDelete(app.app_id)"
                  class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                >
                  <Trash2 class="w-3.5 h-3.5 inline" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增 / 编辑应用 Modal -->
    <Teleport to="body">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 class="text-base font-bold text-slate-100">
              {{ isEditing ? '编辑项目配置' : '新增项目应用' }}
            </h3>
            <button @click="isModalOpen = false" class="text-slate-400 hover:text-white">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
            {{ errorMsg }}
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">App ID (项目唯一标识符)</label>
              <input
                v-model="formData.app_id"
                :disabled="isEditing"
                type="text"
                placeholder="例如: jhc-web, mall-app"
                class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 font-mono disabled:opacity-50 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label class="block text-slate-300 font-medium mb-1">应用显示名称</label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="例如: 久宏川智慧燃气平台"
                class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label class="block text-slate-300 font-medium mb-1">API Secret Key / 通信 Token</label>
              <input
                v-model="formData.api_key"
                type="text"
                placeholder="密钥令牌 (留空自动生成)"
                class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800 flex justify-end space-x-2">
            <button
              @click="isModalOpen = false"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              取消
            </button>
            <button
              @click="handleSubmit"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow"
            >
              保存项目
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
</style>
