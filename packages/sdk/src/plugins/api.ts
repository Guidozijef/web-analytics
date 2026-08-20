import { WebTracker } from "../core/tracker";

/**
 * 判断 URL 是否属于忽略列表 (包括 SDK 自身上报地址及静态资源)
 */
function shouldIgnoreUrl(url: string, reportUrl: string): boolean {
  if (!url) return true;

  // 1. 过滤 SDK 自身上报接口，防止陷入死循环上报
  if (url === reportUrl || url.includes("/api/v1/track")) {
    return true;
  }

  // 2. 过滤静态资源类型请求
  const staticExtRegex = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm)(\?.*)?$/i;
  if (staticExtRegex.test(url)) {
    return true;
  }

  return false;
}

/**
 * 安全格式化 JSON 或字符串参数
 */
function safeParseJson(data: any): any {
  if (data === null || data === undefined) return "";
  if (typeof data === "object") return data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.substring(0, 1000);
      }
    }
    return trimmed.substring(0, 1000);
  }
  return String(data);
}

/**
 * 自动监听业务接口 HTTP 请求插件 (拦截 XMLHttpRequest 与 fetch)
 */
export function initApiPlugin(tracker: WebTracker): void {
  if (typeof window === "undefined") return;

  const reportUrl = tracker.getOptions().requestUrl || "";

  // -------------------------------------------------------------
  // 1. 拦截 XMLHttpRequest (Axios / RuoYi 框架核心底层请求)
  // -------------------------------------------------------------
  if (window.XMLHttpRequest) {
    const OriginalXHROpen = XMLHttpRequest.prototype.open;
    const OriginalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, user?: string | null, password?: string | null) {
      const urlStr = typeof url === "string" ? url : url.toString();
      (this as any).__wt_method = (method || "GET").toUpperCase();
      (this as any).__wt_url = urlStr;
      return OriginalXHROpen.apply(this, [method, url, async, user, password] as any);
    };

    XMLHttpRequest.prototype.send = function (body?: any) {
      const xhr = this as any;
      const url = xhr.__wt_url || "";
      const method = xhr.__wt_method || "GET";

      if (!shouldIgnoreUrl(url, reportUrl)) {
        const startTime = Date.now();
        xhr.__wt_startTime = startTime;
        xhr.__wt_body = body;

        xhr.addEventListener("loadend", () => {
          try {
            const duration = Date.now() - startTime;
            const status = xhr.status || 0;
            const success = status >= 200 && status < 400;

            // 提取请求参数
            let requestParams: any = "";
            if (method === "GET") {
              const urlObj = new URL(url, window.location.origin);
              const queryParams: Record<string, string> = {};
              urlObj.searchParams.forEach((val, key) => {
                queryParams[key] = val;
              });
              requestParams = Object.keys(queryParams).length > 0 ? queryParams : "";
            } else {
              requestParams = safeParseJson(xhr.__wt_body);
            }

            // 提取响应预览
            let responseData: any = "";
            if (xhr.responseText) {
              responseData = safeParseJson(xhr.responseText);
            }

            tracker.report("api", "api_request", {
              url: url,
              method: method,
              status: status,
              duration: duration,
              success: success,
              request_params: requestParams,
              response_data: responseData,
            });
          } catch (err) {
            console.warn("[WebTracing] 接口数据捕抓拦截异常:", err);
          }
        });
      }

      return OriginalXHRSend.apply(this, [body] as any);
    };
  }

  // -------------------------------------------------------------
  // 2. 拦截 window.fetch 请求
  // -------------------------------------------------------------
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let url = "";
      let method = "GET";
      let requestBody: any = "";

      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method || "GET";
      }

      if (init) {
        if (init.method) method = init.method.toUpperCase();
        if (init.body) requestBody = init.body;
      }

      if (shouldIgnoreUrl(url, reportUrl)) {
        return originalFetch.apply(this, [input, init]);
      }

      const startTime = Date.now();

      try {
        const response = await originalFetch.apply(this, [input, init]);
        const duration = Date.now() - startTime;
        const status = response.status;
        const success = status >= 200 && status < 400;

        // 异步克隆 Response 读取 Response Body
        const clonedResponse = response.clone();
        clonedResponse
          .text()
          .then((text) => {
            let requestParams: any = "";
            if (method === "GET") {
              try {
                const urlObj = new URL(url, window.location.origin);
                const queryParams: Record<string, string> = {};
                urlObj.searchParams.forEach((val, key) => {
                  queryParams[key] = val;
                });
                requestParams = Object.keys(queryParams).length > 0 ? queryParams : "";
              } catch {}
            } else {
              requestParams = safeParseJson(requestBody);
            }

            tracker.report("api", "api_request", {
              url: url,
              method: method,
              status: status,
              duration: duration,
              success: success,
              request_params: requestParams,
              response_data: safeParseJson(text),
            });
          })
          .catch(() => {});

        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        tracker.report("api", "api_request", {
          url: url,
          method: method,
          status: 0,
          duration: duration,
          success: false,
          request_params: safeParseJson(requestBody),
          response_data: { error: err.message || "Network Fetch Error" },
        });
        throw err;
      }
    };
  }
}
