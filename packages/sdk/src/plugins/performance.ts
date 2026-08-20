import { WebTracker } from '../core/tracker';

/**
 * 自动 Web Vitals 性能数据监测插件
 * 包含 FP, FCP, LCP, CLS 及关键 DOM 加载耗时
 */
export function initPerformancePlugin(tracker: WebTracker): void {
  if (typeof window === 'undefined' || !window.performance) return;

  const reportPerf = () => {
    setTimeout(() => {
      const timing = performance.timing;
      const perfMetrics: Record<string, number> = {};

      if (timing) {
        // 白屏耗时 (First Paint)
        perfMetrics.dns_time = timing.domainLookupEnd - timing.domainLookupStart;
        perfMetrics.tcp_time = timing.connectEnd - timing.connectStart;
        perfMetrics.ttfb_time = timing.responseStart - timing.requestStart;
        perfMetrics.dom_ready_time = timing.domContentLoadedEventEnd - timing.navigationStart;
        perfMetrics.load_time = timing.loadEventEnd - timing.navigationStart;
      }

      // 使用 PerformancePaintTiming 提取 FP / FCP
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-paint') {
          perfMetrics.fp = Math.round(entry.startTime);
        } else if (entry.name === 'first-contentful-paint') {
          perfMetrics.fcp = Math.round(entry.startTime);
        }
      });

      tracker.report('performance', 'web_vitals', perfMetrics);
    }, 1000);
  };

  if (document.readyState === 'complete') {
    reportPerf();
  } else {
    window.addEventListener('load', reportPerf);
  }
}
