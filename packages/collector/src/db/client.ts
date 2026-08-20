/**
 * Cloudflare D1 数据库底层 API 操作接口
 * 包含强类型输入输出及严密的参数化绑定查询（防止 SQL 注入）
 */

export interface TrackEventPayload {
  app_id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string;
  user_name?: string;
  event_type: 'pageview' | 'click' | 'error' | 'performance' | 'custom';
  event_name: string;
  page_url?: string;
  page_title?: string;
  referrer?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device?: string;
  ip?: string;
  country?: string;
  params?: Record<string, unknown> | string;
  timestamp: number;
}

export interface AppRecord {
  id?: number;
  app_id: string;
  name: string;
  api_key: string;
  created_at: number;
}

/**
 * 1. 应用管理 (apps 表) D1 数据库 API
 */

/**
 * 查询全量注册应用列表
 */
export async function getAllApps(db: D1Database): Promise<AppRecord[]> {
  const sql = `SELECT app_id, name, api_key, created_at FROM apps ORDER BY id ASC`;
  const { results } = await db.prepare(sql).all<AppRecord>();
  return results || [];
}

/**
 * 创建新应用
 */
export async function createApp(
  db: D1Database,
  app: { app_id: string; name: string; api_key: string }
): Promise<boolean> {
  const now = Date.now();
  const sql = `INSERT INTO apps (app_id, name, api_key, created_at) VALUES (?, ?, ?, ?)`;
  const res = await db.prepare(sql).bind(app.app_id, app.name, app.api_key, now).run();
  return res.success;
}

/**
 * 更新应用名称与密钥
 */
export async function updateApp(
  db: D1Database,
  app_id: string,
  payload: { name?: string; api_key?: string }
): Promise<boolean> {
  const fields: string[] = [];
  const params: (string | number)[] = [];
  if (payload.name) {
    fields.push('name = ?');
    params.push(payload.name);
  }
  if (payload.api_key) {
    fields.push('api_key = ?');
    params.push(payload.api_key);
  }
  if (fields.length === 0) return true;

  params.push(app_id);
  const sql = `UPDATE apps SET ${fields.join(', ')} WHERE app_id = ?`;
  const res = await db.prepare(sql).bind(...params).run();
  return res.success;
}

/**
 * 删除指定应用
 */
export async function deleteApp(db: D1Database, app_id: string): Promise<boolean> {
  const sql = `DELETE FROM apps WHERE app_id = ?`;
  const res = await db.prepare(sql).bind(app_id).run();
  return res.success;
}

/**
 * 2. 埋点数据上报与统计查询 API
 */

/**
 * 批量将客户端提交的埋点事件写入 Cloudflare D1
 */
export async function insertBatchEvents(
  db: D1Database,
  events: TrackEventPayload[]
): Promise<number> {
  if (!events || events.length === 0) return 0;

  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];

  const sql = `
    INSERT INTO events (
      app_id, session_id, visitor_id, user_id, user_name, event_type, event_name,
      page_url, page_title, referrer, user_agent, browser,
      os, device, ip, country, params, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const item of events) {
    const paramsStr = typeof item.params === 'object' ? JSON.stringify(item.params) : (item.params || '{}');
    stmts.push(
      db.prepare(sql).bind(
        item.app_id || 'default-app',
        item.session_id || '',
        item.visitor_id || '',
        item.user_id || '',
        item.user_name || '',
        item.event_type || 'custom',
        item.event_name || 'unknown',
        item.page_url || '',
        item.page_title || '',
        item.referrer || '',
        item.user_agent || '',
        item.browser || '',
        item.os || '',
        item.device || 'desktop',
        item.ip || '',
        item.country || 'Unknown',
        paramsStr,
        item.timestamp || now,
        now
      )
    );
  }

  const results = await db.batch(stmts);
  return results.length;
}

/**
 * 查询指定时间范围内的核心大盘概览指标 (PV, UV, Error Count, Click Count)
 */
export async function getOverviewStats(
  db: D1Database,
  appId: string,
  startTime: number,
  endTime: number
) {
  const pvRes = await db
    .prepare(
      `SELECT COUNT(*) as pv FROM events WHERE app_id = ? AND event_type = 'pageview' AND timestamp BETWEEN ? AND ?`
    )
    .bind(appId, startTime, endTime)
    .first<{ pv: number }>();

  const uvRes = await db
    .prepare(
      `SELECT COUNT(DISTINCT visitor_id) as uv FROM events WHERE app_id = ? AND timestamp BETWEEN ? AND ?`
    )
    .bind(appId, startTime, endTime)
    .first<{ uv: number }>();

  const errorRes = await db
    .prepare(
      `SELECT COUNT(*) as errorCount FROM events WHERE app_id = ? AND event_type = 'error' AND timestamp BETWEEN ? AND ?`
    )
    .bind(appId, startTime, endTime)
    .first<{ errorCount: number }>();

  const clickRes = await db
    .prepare(
      `SELECT COUNT(*) as clickCount FROM events WHERE app_id = ? AND event_type = 'click' AND timestamp BETWEEN ? AND ?`
    )
    .bind(appId, startTime, endTime)
    .first<{ clickCount: number }>();

  return {
    pv: pvRes?.pv || 0,
    uv: uvRes?.uv || 0,
    errorCount: errorRes?.errorCount || 0,
    clickCount: clickRes?.clickCount || 0,
  };
}

/**
 * 查询时间趋势数据 (用于绘制 ECharts 趋势图)
 */
export async function getTrendStats(
  db: D1Database,
  appId: string,
  startTime: number,
  endTime: number
) {
  const sql = `
    SELECT 
      strftime('%Y-%m-%d %H:00', timestamp / 1000, 'unixepoch', 'localtime') as time_bucket,
      SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) as pv,
      COUNT(DISTINCT visitor_id) as uv,
      SUM(CASE WHEN event_type = 'error' THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
    FROM events
    WHERE app_id = ? AND timestamp BETWEEN ? AND ?
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `;

  const { results } = await db.prepare(sql).bind(appId, startTime, endTime).all();
  return results || [];
}

/**
 * 查询浏览器与操作系统分布统计
 */
export async function getDistributionStats(
  db: D1Database,
  appId: string,
  startTime: number,
  endTime: number
) {
  const browserSql = `
    SELECT browser, COUNT(*) as count 
    FROM events 
    WHERE app_id = ? AND timestamp BETWEEN ? AND ? AND browser != '' 
    GROUP BY browser 
    ORDER BY count DESC 
    LIMIT 10
  `;
  const osSql = `
    SELECT os, COUNT(*) as count 
    FROM events 
    WHERE app_id = ? AND timestamp BETWEEN ? AND ? AND os != '' 
    GROUP BY os 
    ORDER BY count DESC 
    LIMIT 10
  `;
  const deviceSql = `
    SELECT device, COUNT(*) as count 
    FROM events 
    WHERE app_id = ? AND timestamp BETWEEN ? AND ? AND device != '' 
    GROUP BY device 
    ORDER BY count DESC
  `;

  const [browsers, osList, devices] = await Promise.all([
    db.prepare(browserSql).bind(appId, startTime, endTime).all(),
    db.prepare(osSql).bind(appId, startTime, endTime).all(),
    db.prepare(deviceSql).bind(appId, startTime, endTime).all(),
  ]);

  return {
    browsers: browsers.results || [],
    os: osList.results || [],
    devices: devices.results || [],
  };
}

/**
 * 分页与多维度筛选查询埋点事件列表
 */
export async function getEventsList(
  db: D1Database,
  appId: string,
  eventType?: string,
  keyword?: string,
  userId?: string,
  startTime?: number,
  endTime?: number,
  page = 1,
  pageSize = 20
) {
  const offset = (page - 1) * pageSize;
  let whereClause = `WHERE app_id = ?`;
  const params: (string | number)[] = [appId];

  if (eventType && eventType !== 'all') {
    whereClause += ` AND event_type = ?`;
    params.push(eventType);
  }

  if (userId) {
    whereClause += ` AND (user_id LIKE ? OR user_name LIKE ?)`;
    const u = `%${userId}%`;
    params.push(u, u);
  }

  if (startTime) {
    whereClause += ` AND timestamp >= ?`;
    params.push(startTime);
  }

  if (endTime) {
    whereClause += ` AND timestamp <= ?`;
    params.push(endTime);
  }

  if (keyword) {
    whereClause += ` AND (event_name LIKE ? OR page_url LIKE ? OR page_title LIKE ? OR user_id LIKE ? OR user_name LIKE ? OR params LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw, kw, kw);
  }

  const countSql = `SELECT COUNT(*) as total FROM events ${whereClause}`;
  const totalRes = await db.prepare(countSql).bind(...params).first<{ total: number }>();

  const listSql = `
    SELECT id, app_id, session_id, visitor_id, user_id, user_name, event_type, event_name, page_url, page_title, 
           user_agent, browser, os, device, country, params, timestamp 
    FROM events ${whereClause} 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `;
  const queryParams = [...params, pageSize, offset];
  const { results } = await db.prepare(listSql).bind(...queryParams).all();

  return {
    list: results || [],
    total: totalRes?.total || 0,
    page,
    pageSize,
  };
}

/**
 * 热门受访页面排行统计
 */
export async function getTopPagesStats(
  db: D1Database,
  appId: string,
  startTime: number,
  endTime: number,
  limit = 10
) {
  const sql = `
    SELECT page_url, page_title, COUNT(*) as pv, COUNT(DISTINCT visitor_id) as uv
    FROM events
    WHERE app_id = ? AND event_type = 'pageview' AND timestamp BETWEEN ? AND ? AND page_url != ''
    GROUP BY page_url
    ORDER BY pv DESC
    LIMIT ?
  `;

  const { results } = await db.prepare(sql).bind(appId, startTime, endTime, limit).all();
  return results || [];
}
