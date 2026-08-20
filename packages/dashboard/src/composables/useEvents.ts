import { shallowRef, ref, computed, watch, onMounted } from 'vue';
import { useAppId } from './useAppId';
import { fetchEvents, EventItem } from '../api/stats';

/**
 * 埋点事件日志明细 Composable (支持用户与时间维度筛选及 App ID 切换)
 */
export function useEvents() {
  const { currentAppId } = useAppId();
  const loading = ref(false);
  const events = shallowRef<EventItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const eventType = ref('all');
  const keyword = ref('');
  const userId = ref('');
  const startDate = ref('');
  const endDate = ref('');

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);

  const loadEvents = async () => {
    loading.value = true;
    try {
      let startTs: number | undefined = undefined;
      if (startDate.value) {
        const parsed = new Date(`${startDate.value}T00:00:00`).getTime();
        if (!isNaN(parsed)) startTs = parsed;
      }

      let endTs: number | undefined = undefined;
      if (endDate.value) {
        const parsed = new Date(`${endDate.value}T23:59:59`).getTime();
        if (!isNaN(parsed)) endTs = parsed;
      }

      const res = await fetchEvents(
        currentAppId.value,
        eventType.value,
        keyword.value,
        userId.value,
        startTs,
        endTs,
        page.value,
        pageSize.value
      );
      events.value = res.list || [];
      total.value = res.total || 0;
    } catch (err) {
      console.error('加载事件列表失败:', err);
    } finally {
      loading.value = false;
    }
  };

  // 页码改变时重新加载
  watch(page, () => {
    loadEvents();
  });

  // 项目 App ID、分页大小或筛选条件改变时重置为第 1 页并重新加载
  watch([currentAppId, pageSize, eventType, startDate, endDate], () => {
    page.value = 1;
    loadEvents();
  });

  onMounted(() => {
    loadEvents();
  });

  const search = () => {
    page.value = 1;
    loadEvents();
  };

  const resetFilters = () => {
    eventType.value = 'all';
    keyword.value = '';
    userId.value = '';
    startDate.value = '';
    endDate.value = '';
    page.value = 1;
    loadEvents();
  };

  return {
    loading,
    currentAppId,
    events,
    total,
    page,
    pageSize,
    totalPages,
    eventType,
    keyword,
    userId,
    startDate,
    endDate,
    search,
    resetFilters,
    refresh: loadEvents,
  };
}
