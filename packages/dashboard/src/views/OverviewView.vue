<script setup lang="ts">
import { computed } from 'vue';
import { useOverview } from '../composables/useOverview';
import Card from '../components/common/Card.vue';
import ChartCard from '../components/common/ChartCard.vue';
import { Eye, Users, AlertTriangle, MousePointerClick, RefreshCw, FileText } from 'lucide-vue-next';

const { loading, overview, trendList, distribution, topPages, refresh } = useOverview();

// 构造趋势图 ECharts 配置
const trendChartOption = computed<echarts.EChartsOption>(() => {
  const dates = trendList.value.map((item) => item.time_bucket.replace(/^\d{4}-/, ''));
  const pvData = trendList.value.map((item) => item.pv);
  const uvData = trendList.value.map((item) => item.uv);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
    },
    legend: {
      data: ['PV (页面浏览)', 'UV (独立访客)'],
      textStyle: { color: '#94a3b8' },
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates.length > 0 ? dates : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'PV (页面浏览)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.4)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0.0)' },
            ],
          },
        },
        lineStyle: { color: '#6366f1', width: 3 },
        data: pvData,
      },
      {
        name: 'UV (独立访客)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(20, 184, 166, 0.4)' },
              { offset: 1, color: 'rgba(20, 184, 166, 0.0)' },
            ],
          },
        },
        lineStyle: { color: '#14b8a6', width: 3 },
        data: uvData,
      },
    ],
  } as echarts.EChartsOption;
});

// 构造浏览器占比饼图 ECharts 配置
const browserPieOption = computed<echarts.EChartsOption>(() => {
  const data = distribution.value.browsers.map((item) => ({
    name: item.browser || 'Unknown',
    value: item.count,
  }));

  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { show: false },
        data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
      },
    ],
  } as echarts.EChartsOption;
});

// 构造 OS 占比饼图 ECharts 配置
const osPieOption = computed<echarts.EChartsOption>(() => {
  const data = distribution.value.os.map((item) => ({
    name: item.os || 'Unknown',
    value: item.count,
  }));

  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' } },
    series: [
      {
        type: 'pie',
        radius: '65%',
        center: ['50%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { show: false },
        data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
      },
    ],
  } as echarts.EChartsOption;
});
</script>

<template>
  <div class="space-y-6">
    <!-- 头部栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">大盘概览 Dashboard</h1>
        <p class="text-xs text-slate-400 mt-1">实时监控页面访问量、独立访客、异常报错及交互热度数据</p>
      </div>
      <button
        @click="refresh"
        :disabled="loading"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center space-x-2 transition-all"
      >
        <RefreshCw :class="['w-4 h-4', { 'animate-spin': loading }]" />
        <span>刷新数据</span>
      </button>
    </div>

    <!-- KPI 指标卡片矩阵 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card title="总页面浏览量 (PV)" :value="overview.pv" subTitle="特定时间段内的总访问次数">
        <template #icon><Eye class="w-5 h-5 text-indigo-400" /></template>
      </Card>
      
      <Card title="独立访客数 (UV)" :value="overview.uv" subTitle="基于设备与 LocalStorage 的独立用户" type="success">
        <template #icon><Users class="w-5 h-5 text-emerald-400" /></template>
      </Card>

      <Card title="JS 运行报错" :value="overview.errorCount" subTitle="前端捕获到的异常与未处理 Rejection" type="danger">
        <template #icon><AlertTriangle class="w-5 h-5 text-rose-400" /></template>
      </Card>

      <Card title="点击与交互事件" :value="overview.clickCount" subTitle="带有 data-track 属性的交互事件" type="warning">
        <template #icon><MousePointerClick class="w-5 h-5 text-amber-400" /></template>
      </Card>
    </div>

    <!-- 核心趋势折线图 -->
    <ChartCard title="PV & UV 实时趋势 (PV/UV Trends)" :option="trendChartOption" height="320px" />

    <!-- 浏览器与 OS 占比图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="浏览器分布 (Browser Distribution)" :option="browserPieOption" height="260px" />
      <ChartCard title="操作系统分布 (OS Distribution)" :option="osPieOption" height="260px" />
    </div>

    <!-- 受访 Top 页面排行 -->
    <div class="glass-panel p-5">
      <div class="flex items-center space-x-2 mb-4">
        <FileText class="w-5 h-5 text-indigo-400" />
        <h3 class="text-base font-semibold text-slate-100">热门受访页面 Top Rankings</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/90 uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-4 py-3">页面地址 (URL)</th>
              <th class="px-4 py-3">页面标题</th>
              <th class="px-4 py-3 text-right">页面浏览量 (PV)</th>
              <th class="px-4 py-3 text-right">独立访客 (UV)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr v-if="topPages.length === 0">
              <td colspan="4" class="py-8 text-center text-slate-500">暂无页面访问排行数据</td>
            </tr>
            <tr v-for="page in topPages" :key="page.page_url" class="hover:bg-slate-850/60">
              <td class="px-4 py-3 font-mono text-indigo-300">{{ page.page_url }}</td>
              <td class="px-4 py-3 font-medium text-slate-200">{{ page.page_title || '-' }}</td>
              <td class="px-4 py-3 text-right font-bold text-slate-100">{{ page.pv.toLocaleString() }}</td>
              <td class="px-4 py-3 text-right text-emerald-400 font-semibold">{{ page.uv.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
