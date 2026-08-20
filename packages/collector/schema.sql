-- =================================================================
-- 数据库初始化 Schema (Cloudflare D1 / SQLite Edge)
-- 包含：应用表 (apps)、埋点事件表 (events) 及高性能检索索引
-- =================================================================

-- 1. 应用注册表：管理监控接入的应用项目
CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL UNIQUE,       -- 应用唯一标识符 (例如: 'my-web-app')
  name TEXT NOT NULL,                -- 应用显示名称 (例如: '官网商城')
  api_key TEXT NOT NULL,             -- 通信密钥/Token (用于 Admin API 鉴权)
  created_at INTEGER NOT NULL        -- 创建时间戳 (毫秒)
);

-- 预置一个默认测试应用账号 (App ID: 'default-app', API Key: 'sk-tracing-secret-key')
INSERT OR IGNORE INTO apps (app_id, name, api_key, created_at) 
VALUES ('default-app', '默认监控应用', 'sk-tracing-secret-key', 1740000000000);

-- 2. 埋点事件表：存储所有前端上报的原始与聚合事件数据
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL,              -- 归属应用 App ID
  session_id TEXT NOT NULL,          -- 会话 ID (页签级或单次访问周期)
  visitor_id TEXT NOT NULL,          -- 访客唯一 ID (设备级 / Cookie / LocalStorage)
  user_id TEXT,                      -- 业务系统当前登录用户 ID
  user_name TEXT,                    -- 业务系统当前登录用户名 / 昵称
  event_type TEXT NOT NULL,          -- 事件大类 ('pageview' | 'click' | 'error' | 'performance' | 'custom')
  event_name TEXT NOT NULL,          -- 事件细分名称 (例如: 'page_render', 'button_click', 'js_error')
  page_url TEXT,                     -- 触发事件的页面 URL 路径
  page_title TEXT,                   -- 触发事件的页面标题
  referrer TEXT,                     -- 来源页面 Referrer URL
  user_agent TEXT,                   -- 客户端 UserAgent 原始字符串
  browser TEXT,                      -- 解析后的浏览器名称及版本 (例如: 'Chrome 122.0')
  os TEXT,                           -- 解析后的操作系统 (例如: 'Windows 11' / 'iOS 17')
  device TEXT,                       -- 设备类型 ('desktop' | 'mobile' | 'tablet')
  ip TEXT,                           -- 客户端 IP (可选保存)
  country TEXT,                      -- Cloudflare Edge 识别的国家/地区代码 (例如: 'CN', 'US')
  params TEXT,                       -- JSON 字符串：包含富客户端元信息(屏幕尺寸/语言/网络)、自定义维度或报错堆栈
  timestamp INTEGER NOT NULL,        -- 事件发生时间戳 (客户端毫秒数)
  created_at INTEGER NOT NULL        -- 服务器接收时间戳 (服务端毫秒数)
);

-- 3. 高频检索索引优化
CREATE INDEX IF NOT EXISTS idx_events_app_time ON events (app_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (app_id, event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events (app_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON events (app_id, user_id);
CREATE INDEX IF NOT EXISTS idx_events_page ON events (app_id, page_url);
