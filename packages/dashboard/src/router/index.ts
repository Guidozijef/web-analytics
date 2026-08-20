import { createRouter, createWebHistory } from 'vue-router';
import OverviewView from '../views/OverviewView.vue';
import EventsView from '../views/EventsView.vue';
import ErrorView from '../views/ErrorView.vue';
import SdkGuideView from '../views/SdkGuideView.vue';
import AppConfigView from '../views/AppConfigView.vue';

const routes = [
  {
    path: '/',
    redirect: '/overview',
  },
  {
    path: '/overview',
    name: 'Overview',
    component: OverviewView,
    meta: { title: '大盘概览 - Web Tracing' },
  },
  {
    path: '/events',
    name: 'Events',
    component: EventsView,
    meta: { title: '埋点明细 - Web Tracing' },
  },
  {
    path: '/errors',
    name: 'Errors',
    component: ErrorView,
    meta: { title: '异常报错 - Web Tracing' },
  },
  {
    path: '/apps',
    name: 'AppConfig',
    component: AppConfigView,
    meta: { title: '项目配置 - Web Tracing' },
  },
  {
    path: '/guide',
    name: 'SdkGuide',
    component: SdkGuideView,
    meta: { title: 'SDK 接入指引 - Web Tracing' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
});

export default router;
