import { shallowRef, ref, watch, onMounted } from 'vue';
import { useAppId } from './useAppId';
import {
  fetchOverview,
  fetchTrend,
  fetchDistribution,
  fetchTopPages,
  OverviewData,
  TrendItem,
  DistributionData,
  TopPageItem,
} from '../api/stats';

/**
 * 大盘概览与趋势图逻辑 Composable (响应式响应 App ID 切换)
 */
export function useOverview() {
  const { currentAppId } = useAppId();
  const loading = ref(false);
  const overview = shallowRef<OverviewData>({ pv: 0, uv: 0, errorCount: 0, clickCount: 0 });
  const trendList = shallowRef<TrendItem[]>([]);
  const distribution = shallowRef<DistributionData>({ browsers: [], os: [], devices: [] });
  const topPages = shallowRef<TopPageItem[]>([]);

  const loadAllStats = async () => {
    loading.value = true;
    const appId = currentAppId.value;
    try {
      const [ovData, trData, distData, pageData] = await Promise.all([
        fetchOverview(appId),
        fetchTrend(appId),
        fetchDistribution(appId),
        fetchTopPages(appId),
      ]);
      overview.value = ovData || { pv: 0, uv: 0, errorCount: 0, clickCount: 0 };
      trendList.value = trData || [];
      distribution.value = distData || { browsers: [], os: [], devices: [] };
      topPages.value = pageData || [];
    } catch (err) {
      console.error('加载统计概览失败:', err);
    } finally {
      loading.value = false;
    }
  };

  // 监听当前选中的项目 App ID，发生切换时自动重新加载大盘数据
  watch(currentAppId, () => {
    loadAllStats();
  });

  onMounted(() => {
    loadAllStats();
  });

  return {
    loading,
    currentAppId,
    overview,
    trendList,
    distribution,
    topPages,
    refresh: loadAllStats,
  };
}
