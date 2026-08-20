/**
 * UserAgent 极简轻量解析工具
 * 用于从客户端 UserAgent 提取浏览器、操作系统及设备类型信息
 */

export interface ParsedUA {
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
}

/**
 * 解析 UserAgent 字符串
 * @param ua 客户端发起的 User-Agent 标头
 * @returns 解析后的浏览器、操作系统与设备类型
 */
export function parseUserAgent(ua: string | undefined | null): ParsedUA {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };
  }

  // 1. 识别操作系统 (OS)
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 2. 识别设备类型 (Device)
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    device = 'tablet';
  } else if (/mobile|iphone|android/i.test(ua)) {
    device = 'mobile';
  }

  // 3. 识别浏览器 (Browser)
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) {
    const match = ua.match(/edg\/([\d.]+)/i);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`;
  } else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)\/([\d.]+)/i);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`;
  } else if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/([\d.]+)/i);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`;
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const match = ua.match(/version\/([\d.]+)/i);
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`;
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  }

  return { browser, os, device };
}
