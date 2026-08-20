import { WebTracker } from '../core/tracker';

/**
 * 支持 Element Plus 与通用组件库的点击事件可查找选择器
 */
const CLICKABLE_SELECTOR = [
  '[data-track]',
  'button',
  'a',
  'input[type="button"]',
  'input[type="submit"]',
  '.el-button',
  '.el-dropdown-item',
  '.el-menu-item',
  '.el-tabs__item',
  '.el-table__row',
  '.el-tree-node__content',
  '.el-pagination button',
  '.el-radio-button',
  '.el-checkbox-button',
  '.el-tag',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
].join(',');

/**
 * 递归清洗获取元素的真实可读文本 (专门解决 Element Plus 图标按钮/图标节点导致的文本缺失问题)
 */
function getElementText(elem: HTMLElement): string {
  if (!elem) return '';

  // 1. 优先读取 title 或 aria-label 属性
  const ariaLabel = elem.getAttribute('aria-label') || elem.getAttribute('title');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  // 2. 特殊表单输入框
  if (elem instanceof HTMLInputElement) {
    if (elem.value && elem.value.trim()) return elem.value.trim();
    if (elem.placeholder && elem.placeholder.trim()) return elem.placeholder.trim();
  }

  // 3. 递归清洗获取元素的 innerText 或 textContent
  let rawText = elem.innerText || elem.textContent || '';

  // 4. 如果点击的是 SVG 图标或空文本节点，向上逐级查找包含该 Icon 的按钮或容器文本
  if (!rawText.trim() && elem.parentElement) {
    let parent: HTMLElement | null = elem.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const pText = parent.innerText || parent.textContent || '';
      if (pText.trim()) {
        rawText = pText;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }

  // 清洗无用换行符与多余连续空格
  const cleanedText = rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanedText.substring(0, 100);
}

/**
 * 生成元素在 DOM 树中的准确 CSS 选择器路径 (Selector Path)
 */
function getElementSelectorPath(elem: HTMLElement | null): string {
  if (!elem || elem === document.body || elem === document.documentElement) return '';

  const path: string[] = [];
  let current: HTMLElement | null = elem;
  let depth = 0;

  while (current && current !== document.body && depth < 5) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter((c) => c.trim() && !c.includes(':'))
        .slice(0, 2)
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
    depth++;
  }

  return path.join(' > ');
}

/**
 * 自动点击事件监测插件 (支持 Element Plus 深度点击捕获)
 */
export function initClickPlugin(tracker: WebTracker): void {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'click',
    (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // 1. 优先查找是否显式声明了 data-track 自定义埋点属性
      const trackElem = target.closest('[data-track]') as HTMLElement | null;
      if (trackElem) {
        const trackName = trackElem.getAttribute('data-track') || 'button_click';
        const trackParamsAttr = trackElem.getAttribute('data-track-params');
        let extraParams = {};
        if (trackParamsAttr) {
          try {
            extraParams = JSON.parse(trackParamsAttr);
          } catch {
            extraParams = { raw: trackParamsAttr };
          }
        }

        const text = getElementText(trackElem);
        const rect = trackElem.getBoundingClientRect();

        tracker.report('click', trackName, {
          tag_name: trackElem.tagName,
          text: text || '自定义埋点按钮',
          id: trackElem.id,
          class_name: trackElem.className,
          element_selector: getElementSelectorPath(trackElem),
          click_position: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
            page_x: Math.round(event.pageX),
            page_y: Math.round(event.pageY),
          },
          bounding_rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
          },
          ...extraParams,
        });
        return;
      }

      // 2. 自动向上匹配通用按钮与 Element Plus 组件元素 (如 el-button, el-dropdown-item, el-menu-item 等)
      const clickableElem = target.closest(CLICKABLE_SELECTOR) as HTMLElement | null;
      if (clickableElem) {
        const text = getElementText(clickableElem) || getElementText(target);
        const rect = clickableElem.getBoundingClientRect();
        const selector = getElementSelectorPath(clickableElem);

        tracker.report('click', 'auto_click', {
          tag_name: clickableElem.tagName,
          text: text || '未知图标/按钮点击',
          id: clickableElem.id,
          class_name: clickableElem.className,
          element_selector: selector,
          click_position: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
            page_x: Math.round(event.pageX),
            page_y: Math.round(event.pageY),
          },
          bounding_rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
          },
        });
      }
    },
    true
  );
}
