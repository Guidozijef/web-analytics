import { Hono } from 'hono';
import {
  getOverviewStats,
  getTrendStats,
  getDistributionStats,
  getEventsList,
  getTopPagesStats,
} from '../db/client';

export interface Env {
  DB: D1Database;
}

const statsRoute = new Hono<{ Bindings: Env }>();

/**
 * 提取常用查询参数 (app_id, startTime, endTime)
 */
function parseTimeParams(c: any) {
  const appId = c.req.query('app_id') || 'default-app';
  const now = Date.now();
  // 默认最近 7 天
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const startTime = parseInt(c.req.query('startTime') || `${sevenDaysAgo}`, 10);
  const endTime = parseInt(c.req.query('endTime') || `${now}`, 10);

  return { appId, startTime, endTime };
}

/**
 * 获取大盘概览指标 (PV, UV, 报错数, 点击数)
 */
statsRoute.get('/overview', async (c) => {
  const { appId, startTime, endTime } = parseTimeParams(c);
  const stats = await getOverviewStats(c.env.DB, appId, startTime, endTime);
  return c.json({ code: 200, data: stats });
});

/**
 * 获取时间趋势图数据
 */
statsRoute.get('/trend', async (c) => {
  const { appId, startTime, endTime } = parseTimeParams(c);
  const trend = await getTrendStats(c.env.DB, appId, startTime, endTime);
  return c.json({ code: 200, data: trend });
});

/**
 * 获取浏览器与操作系统分布
 */
statsRoute.get('/distribution', async (c) => {
  const { appId, startTime, endTime } = parseTimeParams(c);
  const dist = await getDistributionStats(c.env.DB, appId, startTime, endTime);
  return c.json({ code: 200, data: dist });
});

/**
 * 分页与多筛选获取埋点日志列表
 */
statsRoute.get('/events', async (c) => {
  const appId = c.req.query('app_id') || 'default-app';
  const eventType = c.req.query('event_type');
  const keyword = c.req.query('keyword');
  const userId = c.req.query('user_id');
  const startTime = c.req.query('startTime') ? parseInt(c.req.query('startTime')!, 10) : undefined;
  const endTime = c.req.query('endTime') ? parseInt(c.req.query('endTime')!, 10) : undefined;
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '20', 10);

  const result = await getEventsList(
    c.env.DB,
    appId,
    eventType,
    keyword,
    userId,
    startTime,
    endTime,
    page,
    pageSize
  );
  return c.json({ code: 200, data: result });
});

/**
 * 获取热门受访页面排行
 */
statsRoute.get('/top-pages', async (c) => {
  const { appId, startTime, endTime } = parseTimeParams(c);
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const topPages = await getTopPagesStats(c.env.DB, appId, startTime, endTime, limit);
  return c.json({ code: 200, data: topPages });
});

export default statsRoute;
