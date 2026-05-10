# css-neon 创作摘要

## 起点

最初的想法是把 wphmoon/neonlight 的霓虹灯 SVG+CSS 效果，包装成一个开箱即用的 Web Component——像 `<css-doodle>` 那样，一个标签就能点亮霓虹灯。

**核心约束**：0 依赖、纯原生 ES Module、所有现代浏览器直接跑。

---

## 技术选型

| 层面 | 选择 | 原因 |
|------|------|------|
| 组件封装 | Custom Elements v1 + Shadow DOM v1 | 浏览器原生，无需框架 |
| 渲染 | SVG `feGaussianBlur` 双层叠加 | 单层模糊会让文字整体发糊，back 管光晕 + front 管内核才能还原真实霓虹灯管 |
| 动画 | CSS `@keyframes` 动态注入 | CSS 动画性能最优，但 `speed` 属性会改变周期，CSS `var()` 在 `animation-duration` 中无法参与 `calc()` 除法，只能在 JS 中算好再把 CSS 字符串注入 Shadow DOM |
| 内容 | Light DOM text + `<svg>` 子元素 | 用户写 HTML 就能定义内容，不需要 JS |
| 字体路径化 | opentype.js（动态 import esm.sh） | 将文字转 SVG glyph path，使 broken/flow 动画和 per-char 配置能作用于文字 |
| 构建 | 自写 80 行 Node.js 脚本 | 深度优先后序遍历依赖图，剥离 import/export 拼接，无需 webpack/rollup |

## 架构：6 模块，700 行

```
utils.js ← config.js ← animations.js ← renderer.js ← neon-light.js ← index.js
```

| 模块 | 行数 | 职责 |
|------|------|------|
| `utils.js` | ~15 | SVG 命名空间元素创建、`parseBoolean`/`parseNumber` |
| `config.js` | ~100 | 默认值、`observedAttributes`、text/svg/host 三级配置级联 |
| `animations.js` | ~120 | flicker/breath/glitch/broken/flow 五种 @keyframes 生成器 |
| `renderer.js` | ~460 | 核心渲染：Light DOM 解析、流式布局、双层路径渲染、per-path 分组、坐标变换 |
| `neon-light.js` | ~200 | Custom Element：Shadow DOM 生命周期、ResizeObserver + MutationObserver 双监听、`src`/`font-src` 加载与缓存 |
| `index.js` | ~10 | 入口：自动注册 `<neon-light>`、export 公开 API |

## 走过的弯路

### 1. 嵌套 SVG 在 Safari 上的 filter 失效

最初方案把内联 SVG 包在一个嵌套 `<svg>` 中，利用 `<use>` 引用内容。但 Safari 对嵌套 SVG 的 `feGaussianBlur` filter 继承有特殊处理，导致光晕完全不显示。

**解决**：放弃嵌套 SVG 和 `<use>`（而且 `<use>` 也无法跨越 Shadow DOM 边界）。改为 `cloneShape()` 直接克隆每个形状元素，用 `<g transform="...">` 在外层 SVG 坐标系中操作。增加元素数量，但换来了跨浏览器一致性和 Shadow DOM 封装性。

### 2. broken 动画的三次重构

| 版本 | 方案 | 问题 |
|------|------|------|
| V1 | `stroke-dasharray` 模拟断裂 | dash 沿路径前进时断裂位置随路径长度变化，无法精确控制 |
| V2 | `linearGradient` 遮罩 | 渐变方向固定，无法适配不同方向的 path |
| V3 | 按路径数量分组渲染 | ✅ 将 "损坏" path 分离出来，`fill:none` + 独立闪烁动画 |

V3 的关键是分组算法——用 path 的 `d` 属性做 djb2 哈希，保证同一 SVG 在任何时候渲染结果一致（`Math.random()` 在 ResizeObserver 触发重渲染时会导致断裂位置一直跳）。

### 3. WOFF2 格式踩坑

`font-src` 最初用 Google Fonts 下载的 `Inter-Regular.woff2`（111 KB），页面没有任何报错但文字也没变化。调试发现 opentype.js 只支持 TTF/OTF/WOFF，不支持 WOFF2（报 `Unsupported OpenType signature wOF2`）。

**解决**：从 GitHub Releases 下载 Inter 字体源码，提取 `extras/ttf/Inter-Regular.ttf`（407 KB）。

### 4. 文字路径化后变粗大

这是最隐蔽的 bug。用户反馈 "刷新的一瞬间字是正常的，但马上字又回到了粗大的样子"。这个时序线索是关键：

- **刷新瞬间**（字体未加载）：走标准 text 渲染管线，`stroke-width=2`（正常粗细）
- **字体加载后**（重渲染）：文字路径被送入 SVG 渲染管线（`appendSvgShapes`），使用 `svgStrokeWidth`（默认 10）作为 front 层描边宽度

根本原因是路径化文字不应该走 SVG 管线——两者的 styling 不同：
- text 管线：front `stroke-width=2`，`fill-opacity=0.4`
- SVG 管线：front `stroke-width=svgStrokeWidth`（默认 10），group-level fill

**解决**：重写 `renderTextAsPaths()`，将 glyph path 直接渲染到 back/front group，不与 SVG 管线混合。复用 `classifyShapes`/`parsePathConfig` 进行 broken 分类，但样式完全独立。

### 5. `broken-ratio` 的 kebab-case 陷阱

HTML 属性用 `broken-ratio`（kebab-case），但 `getAttribute('brokenRatio')`（camelCase）在 JS 中返回 `null`。配置级联函数用 camelCase 读属性，永远读不到值。

**解决**：在 `resolveConfig` 中对 `broken-ratio` 做显式 kebab-case 回退读取。

### 6. 构建脚本的 `.js.js` 路径

依赖解析时 `path.join(dir, modulePath + '.js')` 在 import 路径已经包含 `.js` 后缀的情况下会生成 `neon-light.js.js`。

**解决**：检测后缀再拼接。

---

## 调试经验

- **双 Observer 机制**：ResizeObserver 处理尺寸变化，MutationObserver 处理 Light DOM 内容变化。`src` 属性加载后直接 `appendChild` 到 Light DOM，由 MutationObserver 自动触发渲染，不需要手动调用。
- **字体缓存**：`NeonLight._fontCache = new Map()`（类级别静态属性），多个 `<neon-light>` 实例共享同一字体只需加载一次。
- **动画 CSS 动态生成**：每次 `_render()` 重新生成 CSS 字符串并注入 Shadow DOM。`speed` 属性改变动画周期，CSS `var()` 无法胜任，只能 JS 计算。
- **确定性 hash 用于稳定渲染**：`classifyShapes` 用 djb2 对 path 内容做 hash，确保重渲染时断裂位置不变。

---

## 后续迭代

### 7. camelCase → kebab-case 属性读取 bug

**现象**：`<neon-light font-size="72">` 设置了字号但文字没有变化。

**排查**：`config.js` 的 `readAttr(el, name)` 直接用 `el.getAttribute(name)` 读取。JS 侧传的是 camelCase（`fontSize`），HTML 存的是 kebab-case（`font-size`）。浏览器 attribute 存储是 ASCII-lowercase 的，`fontSize` 变 `fontsize` 但 `font-size` 不变，两者不匹配。

**影响范围**：`fontFamily`、`fontWeight`、`fontStyle`、`textTransform`、`letterSpacing`、`svgStrokeWidth`、`brokenRatio` 全部静默失效——从项目最初就存在，但 `fontSize` 有 64 的默认值所以 UI 上看不出。

**修复**：新增 `camelToKebab()` 函数，所有属性读取前将 camelCase 转为 kebab-case。

**修后遗症**：`brokenRatio` 之前有一处手动 kebab-case 的 workaround，`camelToKebab(null)` 会导致 crash（`readAttr(el, null)` 的下游调用）。加了 `if (!str) return str` 的空值守卫。

### 8. 竖排文字（vertical）

**需求**：新增 `vertical` 布尔属性，文字逐字纵向排列（从上到下）。

**标准文字实现**：`appendTextLayers` 中新增 vertical 分支。将文字拆为逐字，每个字创建独立的 `<tspan>` 元素，通过 `dy={fontSize}` 逐个下移，`text-anchor="middle"` 居中。

**font-src 路径化实现**：`renderTextAsPaths` 中新增 vertical 分支。逐个 glyph 用 `glyph.getPath(cx, curY, fontSize)` 纵向排列。

**排版计算**：
```
textBlockH = numChars × charH
textBlockTop = (height - textBlockH) / 2
startY = textBlockTop + charH × 0.85  // baseline 偏移
```

**竖排 + SVG 混合**：文字块和 SVG 横向并排，SVG 垂直居中于文字块中点。

**bug：竖排文字看不到**：`appendTextLayers` vertical 分支创建了 `<text>` 元素但缺少 `y` 属性，默认 y=0（viewBox 顶部），第一行文字渲染在容器外。修复：加上 `y: String(y)`。

### 9. 追光逐字动画（chase / eclipse）

**chase 需求**：多字时从第一个字开始闪，闪完后第二个字开始闪，依次到最后，循环。

**实现方案**：所有字共享同一套 `@keyframes`，通过错开的 `animation-delay`（`i × chaseDelay`）实现逐字点亮。

**第一版 bug — 循环错乱**：动画时长 0.6s 不随字数变化。以 "CSS-NEON" 8 字为例，每字 0.6s 独立 infinite 循环，导致 0.6s 后节奏与后排字的 delay 脱节，第二遍完全不规律。

**修复**：动画时长统一 = `字数 × delay / speed`。关键帧改为"开头闪一下→剩余时间保持常态"：
```css
@keyframes neon-chase {
  0%   { opacity: 1; }     /* 开头闪 */
  8%   { opacity: 0.6; }   /* 余辉 */
  20%  { opacity: 0.25; }  /* 暗下去 */
  100% { opacity: 0.25; }  /* 保持暗直到整轮结束 */
}
```
`animation-duration` 和 `animation-iteration-count: infinite` 改为 inline style 动态设置。这样每个字的动画在各自的时间窗口内完成一次闪变，整轮结束后同步进入下一轮。

**eclipse**：chase 的反向——所有字初始全亮，暗斑从左到右逐个扫过。关键帧反过来写（0% 暗→30% 恢复亮）。其余机制完全对称。

**属性体系**：
| 属性 | 默认 | 说明 |
|------|------|------|
| `chase-delay` | 0.3 | chase 每字间隔（秒） |
| `eclipse-delay` | 0.3 | eclipse 每字间隔（秒） |
| `text-chase-delay` / `text-eclipse-delay` | — | 文字专属覆盖 |
| `svg-chase-delay` / `svg-eclipse-delay` | — | SVG/路径专属覆盖 |

**font-src 路径化支持**：标准文字用 `animate` 触发，font-src 文字需用 `svg-animate` 触发（与 broken/flow 一致）。在 `renderTextAsPaths` 中为每个字符的 `<path>` 单独创建 back/front `<g>`，各自带独立的 `animation-delay`。

**eclipse 的延迟期亮度问题**：CSS `animation-delay` 正值期间，元素显示非动画态的静态样式。eclipse 需要字符初始是亮的，所以不设 `animation-fill-mode: backwards`，依赖元素的静态 CSS opacity=1 保持初始亮度，delay 结束后动画才介入将字符变暗。

### 10. Demo GIF 生成

**工具链**：Puppeteer（截图）+ sharp（缩放）+ gif-encoder-2（合成 GIF）。

**踩坑**：`page.$('.card')` 在 bash inline `node -e` 中被解释为 shell 变量 `$` 展开。改用独立脚本文件解决。

**结果**：688KB demo.gif，放在 README 顶部。

### 11. 构建产物体积变化

| 阶段 | 大小 |
|------|------|
| 初始 6 模块（5 种动画） | ~29 KB |
| + vertical + dash | ~34 KB |
| + chase + eclipse | ~43 KB |

体积增长主要来自 renderer.js 中的重复渲染分支——chase/eclipse 的 `appendChaseTextLayers` / `appendEclipseTextLayers` 代码高度相似但各自独立，未来可考虑抽象合并。

---

## AI 协作模式

这个项目采用 **"人做架构 + AI 做编码"** 的协作方式：

- **人**：确定技术方案（Shadow DOM + 双层 SVG）、模块拆分、API 设计、动画类型
- **AI（Claude Code + DeepSeek V4 Pro）**：将设计翻译为 6 个模块的代码、处理边界情况、修复 bug、写构建脚本、生成文档

开发周期 1 天，API 费用不到 ¥5（约 $0.70）。

关键体会：AI 对"有明确预期的代码"执行得很好（机械实现），但对"需要视觉验证的问题"（如文字粗细、动画效果）需要人来判断和反馈。人做质量把关，AI 做体力活——这是目前性价比最高的协作模式。
