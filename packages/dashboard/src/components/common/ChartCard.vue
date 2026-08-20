<script setup lang="ts">
import { useTemplateRef, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
  title: string;
  option: echarts.EChartsOption;
  height?: string;
}>();

const chartRef = useTemplateRef<HTMLDivElement>('chartContainer');
const chartInstance = shallowRef<echarts.ECharts | null>(null);

const initChart = () => {
  if (!chartRef.value) return;
  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value, 'dark');
  }
  chartInstance.value.setOption({
    backgroundColor: 'transparent',
    ...props.option,
  });
};

const handleResize = () => {
  chartInstance.value?.resize();
};

watch(
  () => props.option,
  (newOpt) => {
    if (chartInstance.value) {
      chartInstance.value.setOption(newOpt, true);
    }
  },
  { deep: true }
);

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance.value?.dispose();
});
</script>

<template>
  <div class="glass-panel p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-200 tracking-wide">{{ props.title }}</h3>
      <slot name="extra" />
    </div>
    <div
      ref="chartContainer"
      :style="{ height: props.height || '300px', width: '100%' }"
    ></div>
  </div>
</template>

<style scoped>
</style>
