import { Hono } from 'hono';
import { parseUserAgent } from '../utils/ua-parser';
import { insertBatchEvents, TrackEventPayload } from '../db/client';

export interface Env {
  DB: D1Database;
}

const trackRoute = new Hono<{ Bindings: Env }>();

// 显式拦截处理此路由下的 OPTIONS 预检请求
trackRoute.options('*', (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.text('', 204);
});

/**
 * 埋点事件收集接口 (POST /api/v1/track)
 * 接受 `navigator.sendBeacon` 或 `fetch` 发送的单条或批量埋点数据
 */
trackRoute.post('/', async (c) => {
  // 设置 CORS 跨域响应头
  c.header('Access-Control-Allow-Origin', '*');

  try {
    let body: TrackEventPayload | TrackEventPayload[];
    const contentType = c.req.header('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        body = await c.req.json();
      } catch {
        return c.json({ code: 400, message: 'JSON 格式解析失败' }, 400);
      }
    } else {
      const text = await c.req.text();
      if (!text || !text.trim()) {
        return c.json({ code: 400, message: '请求体 Body 为空' }, 400);
      }
      try {
        body = JSON.parse(text);
      } catch {
        return c.json({ code: 400, message: '文本 JSON 解析失败' }, 400);
      }
    }

    const rawEvents = Array.isArray(body) ? body : [body];
    if (rawEvents.length === 0) {
      return c.json({ code: 400, message: '为空的埋点 Payload' }, 400);
    }

    // 提取 Cloudflare Edge 节点透传的信息
    const userAgent = c.req.header('user-agent') || '';
    const parsedUA = parseUserAgent(userAgent);
    const country = c.req.header('cf-ipcountry') || 'Unknown';
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '';

    // 归一化并清洗数据
    const normalizedEvents: TrackEventPayload[] = rawEvents.map((item) => ({
      app_id: item.app_id || 'default-app',
      session_id: item.session_id || 'sess_' + Math.random().toString(36).substring(2, 10),
      visitor_id: item.visitor_id || 'vis_' + Math.random().toString(36).substring(2, 10),
      user_id: item.user_id || '',
      user_name: item.user_name || '',
      event_type: item.event_type || 'custom',
      event_name: item.event_name || 'unknown_event',
      page_url: item.page_url || '',
      page_title: item.page_title || '',
      referrer: item.referrer || '',
      user_agent: userAgent,
      browser: item.browser || parsedUA.browser,
      os: item.os || parsedUA.os,
      device: item.device || parsedUA.device,
      ip: clientIp,
      country: country,
      params: item.params || {},
      timestamp: item.timestamp || Date.now(),
    }));

    // 写入 Cloudflare D1 数据库
    const count = await insertBatchEvents(c.env.DB, normalizedEvents);

    return c.json({
      code: 200,
      message: '上报成功',
      data: { inserted: count },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('埋点接收错误:', error);
    return c.json({ code: 500, message: '服务器写入异常', error: error.message }, 500);
  }
});

export default trackRoute;
