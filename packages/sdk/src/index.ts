import { WebTracker, SDKOptions } from './core/tracker';
import { initPVPlugin } from './plugins/pv';
import { initClickPlugin } from './plugins/click';
import { initErrorPlugin } from './plugins/error';
import { initPerformancePlugin } from './plugins/performance';
import { initApiPlugin } from './plugins/api';

let globalTracker: WebTracker | null = null;

/**
 * Web Tracing SDK 初始化函数
 * @param options SDK 配置参数
 * @returns WebTracker 实例
 */
export function init(options: SDKOptions): WebTracker {
  if (globalTracker) {
    return globalTracker;
  }

  const tracker = new WebTracker(options);
  const opts = tracker.getOptions();

  if (opts.autoPV) {
    initPVPlugin(tracker);
  }
  if (opts.autoClick) {
    initClickPlugin(tracker);
  }
  if (opts.autoError) {
    initErrorPlugin(tracker);
  }
  if (opts.autoPerformance) {
    initPerformancePlugin(tracker);
  }
  if (opts.autoApi) {
    initApiPlugin(tracker);
  }

  globalTracker = tracker;
  return tracker;
}

/**
 * 获取全局 SDK Tracker 实例
 */
export function getTracker(): WebTracker | null {
  return globalTracker;
}

/**
 * 设置当前登录用户标识
 */
export function setUser(user: { userId: string; userName?: string }): void {
  if (globalTracker) {
    globalTracker.setUser(user);
  }
}

/**
 * 清理登录用户标识
 */
export function clearUser(): void {
  if (globalTracker) {
    globalTracker.clearUser();
  }
}

/**
 * 快捷埋点方法
 */
export function track(eventName: string, params: Record<string, unknown> = {}): void {
  if (globalTracker) {
    globalTracker.trackEvent(eventName, params);
  } else {
    console.warn('[WebTracing] SDK 未初始化，请先调用 init({ appId: ... })');
  }
}

export default {
  init,
  getTracker,
  setUser,
  clearUser,
  track,
};
