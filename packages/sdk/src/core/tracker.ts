/**
 * Web Tracing SDK 核心控制器与上报引擎
 * 包含丰富的环境元数据采集、用户标识追踪及 Beacon/Fetch 安全传输
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
}

export interface TrackPayload {
  app_id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string;
  user_name?: string;
  event_type: "pageview" | "click" | "error" | "api" | "performance" | "custom";
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

  constructor(options: SDKOptions) {
    this.options = {
      appId: options.appId || "default-app",
      requestUrl: options.requestUrl || "http://127.0.0.1:8787/api/v1/track",
      autoPV: options.autoPV ?? true,
      autoClick: options.autoClick ?? true,
      autoError: options.autoError ?? true,
      autoPerformance: options.autoPerformance ?? true,
      autoApi: options.autoApi ?? true,
      getUser: options.getUser || (() => ({})),
    };

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
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
    const STORAGE_KEY = "__wt_visitor_id__";
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = "v_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return "v_" + Math.random().toString(36).substring(2, 12);
    }
  }

  /**
   * 获取或单次会话级生成 Session ID
   */
  private getOrCreateSessionId(): string {
    const STORAGE_KEY = "__wt_session_id__";
    try {
      let id = sessionStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = "s_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return "s_" + Math.random().toString(36).substring(2, 12);
    }
  }

  /**
   * 自动采集更具体的设备与环境元数据 (屏幕分辨率、视口大小、网络延迟、内存占用、屏幕方向)
   */
  private getEnvMetadata(): Record<string, unknown> {
    if (typeof window === "undefined") return {};

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const memory = (performance as any)?.memory;

    return {
      screen_size: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || "zh-CN",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
      net_type: connection?.effectiveType || (navigator.onLine ? "online" : "offline"),
      net_rtt: connection?.rtt ? `${connection.rtt}ms` : undefined,
      net_downlink: connection?.downlink ? `${connection.downlink}Mbps` : undefined,
      pixel_ratio: window.devicePixelRatio || 1,
      screen_orientation: window.screen.orientation?.type || "unknown",
      memory_heap_used: memory?.usedJSHeapSize ? `${Math.round(memory.usedJSHeapSize / 1048576)}MB` : undefined,
    };
  }

  /**
   * 通用埋点上报方法
   */
  public report(eventType: TrackPayload["event_type"], eventName: string, params: Record<string, unknown> = {}): void {
    // 优先读取手动 setUser，其次调用动态 getUser 钩子
    let dynamicUser = {};
    try {
      dynamicUser = this.options.getUser() || {};
    } catch {}

    const userId = this.userInfo.userId || (dynamicUser as any).userId || (dynamicUser as any).user_id || "";
    const userName = this.userInfo.userName || (dynamicUser as any).userName || (dynamicUser as any).user_name || userId;

    // 自动丰富设备与环境元数据
    const envMeta = this.getEnvMetadata();
    const enrichedParams = {
      ...envMeta,
      ...params,
    };

    const payload: TrackPayload = {
      app_id: this.options.appId,
      session_id: this.sessionId,
      visitor_id: this.visitorId,
      user_id: String(userId || ""),
      user_name: String(userName || ""),
      event_type: eventType,
      event_name: eventName,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      params: enrichedParams,
      timestamp: Date.now(),
    };

    this.send(payload);
  }

  /**
   * 使用 sendBeacon 或 fetch 提交数据
   */
  private send(payload: TrackPayload): void {
    const data = JSON.stringify(payload);

    // 1. 优先使用 navigator.sendBeacon (使用 text/plain 可规避跨域 Preflight OPTIONS 预检请求)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([data], { type: "text/plain; charset=UTF-8" });
      const success = navigator.sendBeacon(this.options.requestUrl, blob);
      if (success) return;
    }

    // 2. 回退使用 fetch keepalive 保证跨域上报不丢失
    if (typeof fetch !== "undefined") {
      fetch(this.options.requestUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch((err) => {
        console.warn("[WebTracing] 上报失败:", err);
      });
    }
  }

  /**
   * 手动上报自定义事件
   */
  public trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
    this.report("custom", eventName, params);
  }
}
