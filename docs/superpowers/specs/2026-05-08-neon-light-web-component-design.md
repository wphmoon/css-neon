# <neon-light> Web Component 设计文档

## 概述

基于 Shadow DOM v1 和 Custom Elements v1 实现的霓虹灯特效 Web Component。参考 [wphmoon/neonlight](https://github.com/wphmoon/neonlight) 的 SVG+CSS 霓虹灯渲染技术和 [css-doodle](https://github.com/css-doodle/css-doodle) 的 Web Component 包装模式。

- 自定义元素名称：`<neon-light>`
- 纯原生 ES Module，无构建工具依赖
- 现代浏览器直接可用

## 架构

单元素 + Light DOM 内容解析模式。用户将文字和 SVG 写在 `<neon-light>` 标签内，组件解析 light DOM 子节点后在 Shadow DOM 内构建双层 SVG 渲染管线（光芒层 + 核心层）。

```
<neon-light> (HTMLElement)
  ├── Light DOM: 用户内容（文本节点 + <svg> 元素）
  └── Shadow DOM (mode: open)
        └── <svg class="neon-surface">
              ├── <defs>
              │     └── <filter id="neon-blur">
              │           └── <feGaussianBlur>
              ├── <g class="neon-back">   ← 光芒层 (blur + 粗stroke + dasharray)
              │     ├── <text>
              │     └── <path>
              ├── <g class="neon-front">  ← 核心层 (细stroke, 无blur)
              │     ├── <text>
              │     └── <path>
              └── <style>                 ← 动画 @keyframes
```

## 组件 API

### HTML 属性

#### 全局霓虹属性（对所有内容生效）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `color` | CSS颜色 | `#ff69b4` | 霓虹灯主色调 |
| `glow` | number | `10` | 光晕扩散范围（px），控制 text-shadow |
| `blur` | number | `4` | SVG feGaussianBlur stdDeviation |
| `animate` | enum | `none` | 动画预设：`none` / `flicker` / `breath` / `glitch` |
| `speed` | number | `1` | 动画速度倍率 |
| `dashed` | boolean | `false` | 是否启用断管效果（stroke-dasharray） |

#### 文字专属属性（`text-*` 前缀，覆盖全局）

| 属性 | 说明 |
|------|------|
| `text-color` | 覆盖文字霓虹色 |
| `text-glow` | 覆盖文字光晕范围 |
| `text-blur` | 覆盖文字模糊量 |
| `text-animate` | 覆盖文字动画预设 |
| `text-speed` | 覆盖文字动画速度 |
| `text-dashed` | 覆盖文字断管效果 |

#### SVG 专属属性（`svg-*` 前缀，覆盖全局）

| 属性 | 说明 |
|------|------|
| `svg-color` | 覆盖 SVG 霓虹色 |
| `svg-glow` | 覆盖 SVG 光晕范围 |
| `svg-blur` | 覆盖 SVG 模糊量 |
| `svg-animate` | 覆盖 SVG 动画预设 |
| `svg-speed` | 覆盖 SVG 动画速度 |
| `svg-dashed` | 覆盖 SVG 断管效果 |
| `svg-stroke-width` | SVG 描边宽度 |

#### 字体属性（仅对文字有效）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `font-family` | string | `inherit` | 字体族 |
| `font-size` | number | `64` | 字号（px） |
| `font-weight` | string | `normal` | 字重 |
| `font-style` | string | `normal` | 字体样式 |
| `text-transform` | enum | `none` | `none` / `uppercase` / `lowercase` / `capitalize` |
| `letter-spacing` | number | `0` | 字间距（px） |

### CSS 自定义属性

暴露给高级用户通过 `style` 属性或外部 CSS 覆盖：

```css
--neon-color
--neon-glow-color
--neon-blur-amount
--neon-stroke-width
--neon-animation-duration
--neon-dash-length
--neon-dash-gap
```

### 使用示例

```html
<!-- 基础用法 -->
<neon-light color="#ff69b4" glow="10" animate="flicker">
  霓虹文字
</neon-light>

<!-- 文字 + SVG 混合 -->
<neon-light color="#ff69b4" glow="10" animate="flicker"
            font-family="YouYuan" font-size="64">
  巴黎の玫瑰
  <svg viewBox="0 0 1024 1024" width="64" height="64">
    <path d="M493..." fill="none"/>
  </svg>
</neon-light>

<!-- 文字和SVG各自独立配置 -->
<neon-light 
  color="#ff69b4" glow="10"
  text-color="#00ffcc" text-animate="breath"
  svg-color="#ff4444" svg-glow="20" svg-animate="glitch">
  标题
  <svg>...</svg>
</neon-light>

<!-- CSS 变量覆盖 -->
<neon-light animate="flicker" 
            style="--neon-animation-duration: 3s; --neon-color: #ff0000;">
  自定义速度
</neon-light>
```

## 配置级联系统

优先级：**元素级属性（text-*/svg-*） > 组件级属性 > 内置默认值**

```
resolveConfig(attr, contentType):
  color  ← attr['text-color']  ?? attr['color'] ?? '#ff69b4'  (当 contentType === 'text')
  color  ← attr['svg-color']   ?? attr['color'] ?? '#ff69b4'  (当 contentType === 'svg')
  glow   ← attr['text-glow']   ?? attr['glow']  ?? 10
  ...以此类推
```

## Shadow DOM 渲染架构

### 渲染流程

1. `connectedCallback()` 触发首次渲染
2. 遍历 light DOM `childNodes`
3. 文本节点 → 生成 `<text>` 元素，应用字体属性
4. `<svg>` 元素 → 提取 `<path>`/`<circle>` 等几何元素，保留 stroke/fill 属性
5. 每组内容生成双层：`neon-back`（blur + 粗 stroke + dasharray）+ `neon-front`（细 stroke + 无 blur）
6. 组装到 Shadow DOM 的 `<svg class="neon-surface">` 中
7. 根据 `animate` 属性注入 `@keyframes` 到 Shadow `<style>`
8. 每次属性变化时 `attributeChangedCallback` 触发重渲染

### 文字布局

首版按单行流式排列处理：文字和 SVG 图标在同一行从左到右排列。通过调整 text 元素的 `y` 坐标实现垂直居中对齐。

### 尺寸自适应

通过 `ResizeObserver` 监听 host 元素尺寸变化，动态更新内部 `<svg>` 的 `width`/`height`。

## 动画系统

### 三种内置预设

| 预设 | 效果 |
|------|------|
| `flicker` | 不规则闪烁，模拟故障霓虹管。opacity 在多个断点快速切换 |
| `breath` | 缓慢呼吸式明暗变化。opacity 在 0.3 ↔ 1 之间正弦循环 |
| `glitch` | 快速频闪 + 颜色偏移。opacity 剧烈抖动 + stroke 色切换 |

### 关键帧注入

每个预设生成对应的 `@keyframes`，注入到 Shadow DOM 的 `<style>` 标签中。光芒层（back）比核心层（front）有 0.15s 的微小延迟，制造光晕独立跳动的层次感。

动画时长统一受 `speed` 属性影响：`duration = baseDuration / speed`。

### flicker 关键帧

```css
@keyframes neon-flicker {
  0%, 13%, 26%, 37%, 58%, 77%, 100% { opacity: 1; }
  5%, 20%, 30%, 50%, 69%, 90%     { opacity: 0.3; }
}
```

### breath 关键帧

```css
@keyframes neon-breath {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
```

### glitch 关键帧

```css
@keyframes neon-glitch {
  0%, 15%, 55%, 85%         { opacity: 1; stroke: inherit; }
  8%, 23%, 48%, 75%, 92%    { opacity: 0.2; stroke: #fff; }
  35%, 67%                  { opacity: 0.8; stroke: gold; }
}
```

## 文件结构

```
E:\css-neon\
├── neon-light.js     # 主组件类 NeonLight extends HTMLElement
├── renderer.js        # 渲染器：light DOM 解析 → SVG 生成
├── animations.js      # 内置动画预设生成
├── config.js          # 属性解析 + 级联配置合并
├── utils.js           # 工具函数（SVG namespace、DOM 操作）
└── index.js           # 入口：import 汇总 + 自动 define('neon-light', NeonLight)
```

## 生命周期

```
constructor()
  └── this.attachShadow({ mode: 'open' })

connectedCallback()
  └── 解析 light DOM → 渲染 Shadow → 启动 ResizeObserver

disconnectedCallback()
  └── 清理 ResizeObserver

attributeChangedCallback(name, oldVal, newVal)
  └── 如果 oldVal !== newVal 且属性在 observedAttributes 中 → 重新渲染
```

### observedAttributes

所有在"HTML 属性"一节中列出的属性均需列入 `static observedAttributes`。

## 依赖关系

- **零外部依赖**。仅使用浏览器原生 API：
  - `HTMLElement`
  - `customElements.define()`
  - `attachShadow({ mode: 'open' })`
  - `SVGElement` + SVG namespace (`http://www.w3.org/2000/svg`)
  - `ResizeObserver`
  - `MutationObserver`（可选，监听 light DOM 变化）

## 兼容性

- Chrome 54+ / Firefox 63+ / Safari 10.1+ / Edge 79+
- Shadow DOM v1 + Custom Elements v1 标准
