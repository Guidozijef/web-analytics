import { Hono } from 'hono';
import { cors } from 'hono/cors';
import trackRoute from './routes/track';
import statsRoute from './routes/stats';
import appsRoute from './routes/apps';

export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

// 1. 全局配置 CORS 跨域中间件 (允许任意 Origin、Method 及 Header)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
  maxAge: 86400,
}));

// 2. 显式处理全局 OPTIONS 预检请求 (Preflight 204)
app.options('*', (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  c.header('Access-Control-Allow-Headers', '*');
  return c.text('', 204);
});

// 3. 挂载 RESTful API 路由
app.route('/api/v1/track', trackRoute);
app.route('/api/v1/stats', statsRoute);
app.route('/api/v1/apps', appsRoute);

// 4. 健康检查接口
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', server: 'Cloudflare Worker Hono', timestamp: Date.now() });
});

// 5. 异常拦截器：确保即使发生 500 错误也携带 CORS 标头
app.onError((err, c) => {
  console.error('[Hono Error]', err);
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({ code: 500, message: '服务器内部错误', error: err.message }, 500);
});

// 6. 404 兜底与 Cloudflare Assets 托管
app.get('*', async (c, next) => {
  if (c.env.ASSETS) {
    return await c.env.ASSETS.fetch(c.req.raw);
  }
  return next();
});

export default app;
