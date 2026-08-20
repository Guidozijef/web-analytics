/**
 * Web Tracing SDK 核心控制器与批量上报引擎
 * 包含：事件队列缓冲、定时器异步冲刷、浏览器 CPU 空闲 (requestIdleCallback) 上报、
 * 页面卸载/隐藏 (visibilitychange) 紧急 Beacon 离线提交及全量环境与用户关联
 */

export interface SDKOptions {
  /** 应用在后台注册的唯一 App ID */
  appId: string;
  /** 上报 API 地址 (默认: 'http://127.0.0.1:8787/api/v1/track') */
  requestUrl?: string;
  /** 是否自动收集 PV (默认: true) */
  autoPV?: boolean;
  /** 是否自动监听点击事件 (默认: true) */
  autoClick?: boolean;
  /** 是否自动监听 JS 异常 (默认: true) */
  autoError?: boolean;
  /** 是否自动收集 Web Vitals 性能数据 (默认: true) */
  autoPerformance?: boolean;
  /** 是否自动监听业务接口 HTTP 请求 (默认: true) */
  autoApi?: boolean;
  /** 动态获取当前登录用户的回调方法 (可选) */
  getUser?: () => { userId?: string; userName?: string; [key: string]: unknown };

  /** 批量上报最大队列容量 (默认: 10 条，达到该容量立即上报) */
  maxQueueSize?: number;
  /** 定时冲刷上报时间间隔毫秒数 (默认: 5000ms，即 5 秒自动上报一次) */
  flushInterval?: number;
  /** 是否开启 JavaScript 运行报错立即冲刷上报 (默认: true) */
  immediateErrorFlush?: boolean;
}

export interface TrackPayload {
  app_id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string;
  user_name?: string;
  event_type: 'pageview' | 'click' | 'error' | 'api' | 'performance' | 'custom';
  event_name: string;
  page_url?: string;
  page_title?: string;
  referrer?: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

export class WebTracker {
  private options: Required<SDKOptions>;
  private visitorId: string;
  private sessionId: string;
  private userInfo: { userId?: string; userName?: string } = {};

  /** 异步批量事件队列 */
  private queue: TrackPayload[] = [];
  /** 定时刷新定时器句柄 */
  private flushTimer: any = null;

  constructor(options: SDKOptions) {
    this.options = {
      appId: options.appId || 'default-app',
      requestUrl: options.requestUrl || 'http://127.0.0.1:8787/api/v1/track',
      autoPV: options.autoPV ?? true,
      autoClick: options.autoClick ?? true,
      autoError: options.autoError ?? true,
      autoPerformance: options.autoPerformance ?? true,
      autoApi: options.autoApi ?? true,
      getUser: options.getUser || (() => ({})),
      maxQueueSize: options.maxQueueSize ?? 10,
      flushInterval: options.flushInterval ?? 5000,
      immediateErrorFlush: options.immediateErrorFlush ?? true,
    };

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();

    // 启动后台定时器与页面卸载监听器
    this.startFlushTimer();
    this.initUnloadListeners();
  }

  public getOptions(): Required<SDKOptions> {
    return this.options;
  }

  /**
   * 手动设置当前登录用户标识 (例如用户登录完成后调用)
   */
  public setUser(user: { userId: string; userName?: string }): void {
    if (user) {
      this.userInfo = {
        userId: user.userId,
        userName: user.userName || user.userId,
      };
    }
  }

  /**
   * 清除当前登录用户标识 (例如用户登出时调用)
   */
  public clearUser(): void {
    this.userInfo = {};
  }

  /**
   * 获取或持久化生成设备/访客唯一标识 Visitor ID
   */
  private getOrCreateVisitorId(): string {
    const STORAGE_KEY = '__wt_visitor_id__';
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return 'v_' + Math.random().toString(36).substring(2, 12);
    }
  }

  /**
   * 获取或单次会话级生成 Session ID
   */
  private getOrCreateSessionId(): string {
    const STORAGE_KEY = '__wt_session_id__';
    try {
      let id = sessionStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = 's_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return 's_' + Math.random().toString(36).substring(2, 12);
    }
  }

  /**
   * 自动采集设备与环境元数据 (屏幕分辨率、视口大小、网络延迟、内存占用、屏幕方向)
   */
  private getEnvMetadata(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const memory = (performance as any)?.memory;

    return {
      screen_size: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || 'zh-CN',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      net_type: connection?.effectiveType || (navigator.onLine ? 'online' : 'offline'),
      net_rtt: connection?.rtt ? `${connection.rtt}ms` : undefined,
      net_downlink: connection?.downlink ? `${connection.downlink}Mbps` : undefined,
      pixel_ratio: window.devicePixelRatio || 1,
      screen_orientation: window.screen.orientation?.type || 'unknown',
      memory_heap_used: memory?.usedJSHeapSize ? `${Math.round(memory.usedJSHeapSize / 1048576)}MB` : undefined,
    };
  }

  /**
   * 启动 5 秒后台定时冲刷任务
   */
  private startFlushTimer(): void {
    if (typeof window === 'undefined') return;
    if (this.flushTimer) clearInterval(this.flushTimer);

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * 页面切后台、隐藏或关闭时的紧急离线 Flush 监听器
   */
  private initUnloadListeners(): void {
    if (typeof window === 'undefined') return;

    // 当用户切页签或离开页面时，使用 Beacon 瞬间清空上报队列
    const handleUnload = () => {
      this.flush(true);
    };

    if ('visibilitychange' in document) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          handleUnload();
        }
      });
    }

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
  }

  /**
   * 通用埋点触发方法 (优先写入队列缓冲，防阻塞)
   */
  public report(
    eventType: TrackPayload['event_type'],
    eventName: string,
    params: Record<string, unknown> = {}
  ): void {
    let dynamicUser = {};
    try {
      dynamicUser = this.options.getUser() || {};
    } catch {}

    const userId = this.userInfo.userId || (dynamicUser as any).userId || (dynamicUser as any).user_id || '';
    const userName = this.userInfo.userName || (dynamicUser as any).userName || (dynamicUser as any).user_name || userId;

    const envMeta = this.getEnvMetadata();
    const enrichedParams = {
      ...envMeta,
      ...params,
    };

    const payload: TrackPayload = {
      app_id: this.options.appId,
      session_id: this.sessionId,
      visitor_id: this.visitorId,
      user_id: String(userId || ''),
      user_name: String(userName || ''),
      event_type: eventType,
      event_name: eventName,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      params: enrichedParams,
      timestamp: Date.now(),
    };

    // 1. 将事件压入内存缓冲队列
    this.queue.push(payload);

    // 2. 如果是严重 JS 运行报错且开启了即时冲刷，或队列容量达到最大上限 (10条)，立即冲刷上报
    if ((eventType === 'error' && this.options.immediateErrorFlush) || this.queue.length >= this.options.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 将内存队列中的事件批量清空发送
   * @param isSync 是否为紧急同步上报 (例如页面隐藏/关闭时)
   */
  public flush(isSync = false): void {
    if (this.queue.length === 0) return;

    // 从队列中取出全部待发送的事件
    const batchEvents = this.queue.splice(0, this.queue.length);

    if (isSync) {
      // 紧急状态直接同步网络发送
      this.sendBatch(batchEvents);
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // 利用浏览器 CPU 空闲时间 (requestIdleCallback) 异步零阻塞发送
      (window as any).requestIdleCallback(() => {
        this.sendBatch(batchEvents);
      });
    } else {
      setTimeout(() => {
        this.sendBatch(batchEvents);
      }, 0);
    }
  }

  /**
   * 使用 SendBeacon 或 Fetch 批量提交数据至 Cloudflare Worker 收集端
   */
  private sendBatch(batchEvents: TrackPayload[]): void {
    if (!batchEvents || batchEvents.length === 0) return;

    const data = JSON.stringify(batchEvents);

    // 1. 优先使用 navigator.sendBeacon (Blob text/plain 格式规避 CORS Preflight OPTIONS 预检)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'text/plain; charset=UTF-8' });
      const success = navigator.sendBeacon(this.options.requestUrl, blob);
      if (success) return;
    }

    // 2. 回退使用 fetch keepalive 批量提交
    if (typeof fetch !== 'undefined') {
      fetch(this.options.requestUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch((err) => {
        console.warn('[WebTracing] 批量上报失败，回退重新入队:', err);
        // 网络失败时将数据重新压回队列头部，防止丢包
        this.queue.unshift(...batchEvents);
      });
    }
  }

  /**
   * 手动上报自定义事件
   */
  public trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
    this.report('custom', eventName, params);
  }
}
