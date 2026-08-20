import { WebTracker } from '../core/tracker';

/**
 * 自动 JavaScript 全局异常与未捕获 Promise Rejection 监测插件
 */
export function initErrorPlugin(tracker: WebTracker): void {
  if (typeof window === 'undefined') return;

  // 1. 监听常规 JS 运行时错误及资源加载错误
  window.addEventListener(
    'error',
    (event: ErrorEvent | Event) => {
      if (event instanceof ErrorEvent) {
        tracker.report('error', 'js_error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || '',
        });
      } else {
        // 资源 (img, script, link) 加载失败
        const target = event.target as HTMLElement | null;
        if (target) {
          tracker.report('error', 'resource_error', {
            tag_name: target.tagName,
            src: (target as HTMLImageElement).src || (target as HTMLLinkElement).href || '',
          });
        }
      }
    },
    true
  );

  // 2. 监听未处理的 Promise Rejection 错误
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    let reason = event.reason;
    let message = 'Unhandled Promise Rejection';
    let stack = '';

    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack || '';
    } else if (typeof reason === 'string') {
      message = reason;
    } else {
      try {
        message = JSON.stringify(reason);
      } catch {
        message = String(reason);
      }
    }

    tracker.report('error', 'unhandled_rejection', {
      message,
      stack,
    });
  });
}
