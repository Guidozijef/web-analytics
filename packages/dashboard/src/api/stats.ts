/**
 * 后端 API 接口封装层
 */

export interface OverviewData {
  pv: number;
  uv: number;
  errorCount: number;
  clickCount: number;
}

export interface TrendItem {
  time_bucket: string;
  pv: number;
  uv: number;
  errors: number;
  clicks: number;
}

export interface DistributionItem {
  browser?: string;
  os?: string;
  device?: string;
  count: number;
}

export interface DistributionData {
  browsers: DistributionItem[];
  os: DistributionItem[];
  devices: DistributionItem[];
}

export interface EventItem {
  id: number;
  app_id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string;
  user_name?: string;
  event_type: 'pageview' | 'click' | 'error' | 'performance' | 'custom';
  event_name: string;
  page_url: string;
  page_title: string;
  user_agent?: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  params: string;
  timestamp: number;
}

export interface EventsResponse {
  list: EventItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TopPageItem {
  page_url: string;
  page_title: string;
  pv: number;
  uv: number;
}

export interface AppApiItem {
  id?: number;
  app_id: string;
  name: string;
  api_key: string;
  created_at: number;
}

const STATS_API_BASE = '/api/v1/stats';
const APPS_API_BASE = '/api/v1/apps';

/**
 * 1. 统计数据 API
 */

export async function fetchOverview(appId = 'default-app', startTime?: number, endTime?: number): Promise<OverviewData> {
  const query = new URLSearchParams({ app_id: appId });
  if (startTime) query.append('startTime', String(startTime));
  if (endTime) query.append('endTime', String(endTime));

  const res = await fetch(`${STATS_API_BASE}/overview?${query.toString()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTrend(appId = 'default-app', startTime?: number, endTime?: number): Promise<TrendItem[]> {
  const query = new URLSearchParams({ app_id: appId });
  if (startTime) query.append('startTime', String(startTime));
  if (endTime) query.append('endTime', String(endTime));

  const res = await fetch(`${STATS_API_BASE}/trend?${query.toString()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchDistribution(appId = 'default-app', startTime?: number, endTime?: number): Promise<DistributionData> {
  const query = new URLSearchParams({ app_id: appId });
  if (startTime) query.append('startTime', String(startTime));
  if (endTime) query.append('endTime', String(endTime));

  const res = await fetch(`${STATS_API_BASE}/distribution?${query.toString()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchEvents(
  appId = 'default-app',
  eventType?: string,
  keyword?: string,
  userId?: string,
  startTime?: number,
  endTime?: number,
  page = 1,
  pageSize = 20
): Promise<EventsResponse> {
  const query = new URLSearchParams({
    app_id: appId,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (eventType && eventType !== 'all') query.append('event_type', eventType);
  if (keyword) query.append('keyword', keyword);
  if (userId) query.append('user_id', userId);
  if (startTime) query.append('startTime', String(startTime));
  if (endTime) query.append('endTime', String(endTime));

  const res = await fetch(`${STATS_API_BASE}/events?${query.toString()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTopPages(appId = 'default-app', limit = 10): Promise<TopPageItem[]> {
  const query = new URLSearchParams({ app_id: appId, limit: String(limit) });
  const res = await fetch(`${STATS_API_BASE}/top-pages?${query.toString()}`);
  const json = await res.json();
  return json.data;
}

/**
 * 2. 项目应用配置 (Cloudflare D1 apps 表) API
 */

export async function fetchAppsApi(): Promise<AppApiItem[]> {
  const res = await fetch(APPS_API_BASE);
  const json = await res.json();
  return json.data || [];
}

export async function createAppApi(data: { app_id: string; name: string; api_key?: string }) {
  const res = await fetch(APPS_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '创建项目失败');
  }
  return json.data;
}

export async function updateAppApi(app_id: string, data: { name?: string; api_key?: string }) {
  const res = await fetch(`${APPS_API_BASE}/${encodeURIComponent(app_id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '更新项目失败');
  }
  return json;
}

export async function deleteAppApi(app_id: string) {
  const res = await fetch(`${APPS_API_BASE}/${encodeURIComponent(app_id)}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '删除项目失败');
  }
  return json;
}
