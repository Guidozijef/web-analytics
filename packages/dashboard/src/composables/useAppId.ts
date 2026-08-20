import { ref } from 'vue';
import { fetchAppsApi, createAppApi, updateAppApi, deleteAppApi } from '../api/stats';

export interface AppItem {
  id?: number;
  app_id: string;
  name: string;
  api_key: string;
  created_at: number;
}

const DEFAULT_APPS: AppItem[] = [
  { app_id: 'jhc-web', name: '久宏川智慧燃气平台', api_key: 'sk_jhc_web_secret', created_at: 1740000000000 },
  { app_id: 'default-app', name: '默认测试项目', api_key: 'sk_tracing_secret_key', created_at: 1740000000000 },
];

const currentAppId = ref('jhc-web');
const appList = ref<AppItem[]>(DEFAULT_APPS);
const loading = ref(false);

/**
 * 从 Cloudflare D1 数据库 apps 表同步加载全部项目
 */
async function loadAppsFromD1() {
  loading.value = true;
  try {
    const list = await fetchAppsApi();
    if (Array.isArray(list) && list.length > 0) {
      appList.value = list;
      // 如果当前选中的 ID 不在 D1 列表中，重置为列表第一个
      if (!list.some((app) => app.app_id === currentAppId.value)) {
        currentAppId.value = list[0].app_id;
      }
    }
  } catch (err) {
    console.warn('[D1 Sync] 从 D1 apps 表获取数据失败，回退使用本地缓存配置:', err);
  } finally {
    loading.value = false;
  }
}

// 首次模块加载时自动同步 D1 apps 表
loadAppsFromD1();

/**
 * 全局 App ID 与 Cloudflare D1 apps 表注册管理 Composable
 */
export function useAppId() {
  const setCurrentAppId = (id: string) => {
    if (id && appList.value.some((app) => app.app_id === id)) {
      currentAppId.value = id;
    }
  };

  const addApp = async (newApp: { app_id: string; name: string; api_key?: string }) => {
    const exists = appList.value.some((app) => app.app_id === newApp.app_id);
    if (exists) {
      throw new Error(`App ID '${newApp.app_id}' 已存在，请勿重复添加`);
    }

    // 1. 请求 D1 后端 REST API 插入数据库
    await createAppApi(newApp);

    // 2. 刷新 D1 应用列表
    await loadAppsFromD1();
    currentAppId.value = newApp.app_id;
  };

  const updateApp = async (app_id: string, payload: { name?: string; api_key?: string }) => {
    // 1. 请求 D1 后端 REST API 更新数据库
    await updateAppApi(app_id, payload);

    // 2. 刷新 D1 应用列表
    await loadAppsFromD1();
  };

  const deleteApp = async (app_id: string) => {
    if (appList.value.length <= 1) {
      throw new Error('至少需要保留一个项目配置');
    }

    // 1. 请求 D1 后端 REST API 从数据库删除
    await deleteAppApi(app_id);

    // 2. 刷新 D1 应用列表
    await loadAppsFromD1();
  };

  return {
    loading,
    currentAppId,
    appList,
    setCurrentAppId,
    addApp,
    updateApp,
    deleteApp,
    refreshApps: loadAppsFromD1,
  };
}
