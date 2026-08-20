import { Hono } from 'hono';
import { getAllApps, createApp, updateApp, deleteApp } from '../db/client';

export interface Env {
  DB: D1Database;
}

const appsRoute = new Hono<{ Bindings: Env }>();

/**
 * 设置通用的跨域请求头
 */
appsRoute.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return next();
});

appsRoute.options('*', (c) => {
  return c.text('', 204);
});

/**
 * GET /api/v1/apps - 获取全量应用项目列表 (从 Cloudflare D1 apps 表)
 */
appsRoute.get('/', async (c) => {
  try {
    const list = await getAllApps(c.env.DB);
    return c.json({ code: 200, data: list });
  } catch (err: any) {
    return c.json({ code: 500, message: '查询应用列表失败', error: err.message }, 500);
  }
});

/**
 * POST /api/v1/apps - 注册创建新应用项目
 */
appsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { app_id, name, api_key } = body;

    if (!app_id || !name) {
      return c.json({ code: 400, message: 'app_id 与 name 为必填字段' }, 400);
    }

    const secretKey = api_key || 'sk_' + Math.random().toString(36).substring(2, 10);
    await createApp(c.env.DB, { app_id, name, api_key: secretKey });

    return c.json({
      code: 200,
      message: '创建成功',
      data: { app_id, name, api_key: secretKey },
    });
  } catch (err: any) {
    return c.json({ code: 500, message: '创建项目失败', error: err.message }, 500);
  }
});

/**
 * PUT /api/v1/apps/:app_id - 更新指定项目应用名称或密钥
 */
appsRoute.put('/:app_id', async (c) => {
  try {
    const appId = c.req.param('app_id');
    const body = await c.req.json();
    const { name, api_key } = body;

    await updateApp(c.env.DB, appId, { name, api_key });
    return c.json({ code: 200, message: '更新成功' });
  } catch (err: any) {
    return c.json({ code: 500, message: '更新项目失败', error: err.message }, 500);
  }
});

/**
 * DELETE /api/v1/apps/:app_id - 删除指定项目应用
 */
appsRoute.delete('/:app_id', async (c) => {
  try {
    const appId = c.req.param('app_id');
    await deleteApp(c.env.DB, appId);
    return c.json({ code: 200, message: '删除成功' });
  } catch (err: any) {
    return c.json({ code: 500, message: '删除项目失败', error: err.message }, 500);
  }
});

export default appsRoute;
