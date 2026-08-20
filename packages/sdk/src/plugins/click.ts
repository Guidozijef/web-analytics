import { WebTracker } from '../core/tracker';

/**
 * 精准交互组件选择器 (排除表格行、卡片等大面积容器节点)
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
  '.el-pagination button',
  '.el-pagination li',
  '.el-radio-button',
  '.el-checkbox-button',
  '.el-tag',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
].join(',');

/**
 * 精准获取被点击按钮/组件的短小可读文本 (防止把大卡片或整行表格内大量冗余文本收集进来)
 */
function getCleanClickText(target: HTMLElement, clickableElem: HTMLElement): string {
  if (!target && !clickableElem) return '';

  // 1. 优先提取显式指定的 title 或 aria-label
  const ariaLabel =
    target.getAttribute('aria-label') ||
    target.getAttribute('title') ||
    clickableElem.getAttribute('aria-label') ||
    clickableElem.getAttribute('title');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim().substring(0, 30);
  }

  // 2. 提取 Input 类型的按钮或占位文本
  const inputElem = (target instanceof HTMLInputElement ? target : clickableElem) as HTMLInputElement;
  if (inputElem && inputElem.tagName === 'INPUT') {
    if (inputElem.value && inputElem.value.trim()) return inputElem.value.trim().substring(0, 30);
    if (inputElem.placeholder && inputElem.placeholder.trim()) return inputElem.placeholder.trim().substring(0, 30);
  }

  // 3. 提取直系点击节点或组件节点的物理文本
  let rawText = target.innerText || target.textContent || '';
  if (!rawText.trim()) {
    rawText = clickableElem.innerText || clickableElem.textContent || '';
  }

  // 4. 若点击的是 SVG/Icon 节点，向上追溯寻找包含该图标的按钮文本 (防止取到父级超大文本)
  if (!rawText.trim() && target.parentElement) {
    let parent: HTMLElement | null = target.parentElement;
    let depth = 0;
    while (parent && depth < 2 && parent !== document.body) {
      const pText = parent.innerText || parent.textContent || '';
      if (pText.trim()) {
        rawText = pText;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }

  // 5. 核心清洗逻辑：若包含多行换行文本（如表格富单元格），仅截取第一个非空的精简短句
  const lines = rawText
    .split(/[\r\n\t]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);

  const cleanShortText = lines.length > 0 ? lines[0] : '';

  // 限制最大长度在 30 个字符以内，保证控制台与日志极其干净
  return cleanShortText.substring(0, 30);
}

/**
 * 生成元素在 DOM 树中的准确 CSS 选择器路径 (Selector Path)
 */
function getElementSelectorPath(elem: HTMLElement | null): string {
  if (!elem || elem === document.body || elem === document.documentElement) return '';

  const path: string[] = [];
  let current: HTMLElement | null = elem;
  let depth = 0;

  while (current && current !== document.body && depth < 4) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter((c) => c.trim() && !c.includes(':') && !c.startsWith('is-'))
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
 * 自动点击事件监测插件 (支持 Element Plus 深度精确点击捕获)
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

        const text = getCleanClickText(target, trackElem);
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

      // 2. 自动向上匹配通用按钮与 Element Plus 组件交互节点 (如 el-button, el-dropdown-item, el-menu-item 等)
      const clickableElem = target.closest(CLICKABLE_SELECTOR) as HTMLElement | null;
      if (clickableElem) {
        const text = getCleanClickText(target, clickableElem);
        const rect = clickableElem.getBoundingClientRect();
        const selector = getElementSelectorPath(clickableElem);

        tracker.report('click', 'auto_click', {
          tag_name: clickableElem.tagName,
          text: text || '未知按钮点击',
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
