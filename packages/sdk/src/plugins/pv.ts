import { WebTracker } from '../core/tracker';

/**
 * 自动 PV (Page View) 监测插件
 * 支持传统多页应用及单页应用 (SPA History & Hash 路由切换)
 */
export function initPVPlugin(tracker: WebTracker): void {
  if (typeof window === 'undefined') return;

  let lastUrl = window.location.href;

  const sendPV = (triggerType: string) => {
    const currentUrl = window.location.href;
    tracker.report('pageview', 'page_view', {
      trigger: triggerType,
      from_url: lastUrl,
    });
    lastUrl = currentUrl;
  };

  // 1. 首次加载上报 PV
  sendPV('init');

  // 2. 监听 History API (pushState & replaceState)
  const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
    const original = history[method];
    return function (this: History, ...args: Parameters<typeof original>) {
      original.apply(this, args);
      sendPV(method);
    };
  };

  history.pushState = wrapHistoryMethod('pushState');
  history.replaceState = wrapHistoryMethod('replaceState');

  // 3. 监听 popstate & hashchange 事件
  window.addEventListener('popstate', () => sendPV('popstate'));
  window.addEventListener('hashchange', () => sendPV('hashchange'));
}
