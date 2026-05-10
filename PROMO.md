# css-neon：一行标签，点亮你的网页霓虹灯

> 一个 **0 依赖**、**纯原生** Web Component，带你用 HTML 标签写出赛博朋克风格的霓虹灯特效。

---

## 它是什么？

`<neon-light>` 是一个基于 **Shadow DOM v1 + Custom Elements v1** 的自定义 HTML 元素。你不需要写一行 CSS 或 JavaScript，只需要在 HTML 中放一个标签，霓虹灯就亮了：

```html
<neon-light color="#ff69b4" glow="12" font-size="64"
            style="width:600px;height:120px">
  CSS-NEON
</neon-light>
```

字面意思的**开箱即用**。没有构建工具、没有框架绑定、没有第三方依赖。一个 `<script>` 标签引入，所有现代浏览器都能跑。

---

## 它长什么样？——双层渲染引擎

字体的核心部分发出明亮的白光，外围包裹着一层彩色光晕——这是通过 **SVG 双层渲染 + feGaussianBlur 高斯模糊** 实现的。这是整个组件最核心的渲染理念：

### 渲染管线

```
Light DOM（用户内容）
    │
    ▼
┌─────────────────────────────────┐
│  renderLightDom()               │
│  ├─ 遍历 childNodes             │
│  ├─ 分离 Text Node / <svg>      │
│  ├─ 估算文字宽度（CJK 1.1× /    │
│  │   拉丁 0.7× × fontSize）     │
│  └─ 流式布局计算 x 偏移         │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  back 层（光晕层）              │
│  ├─ stroke-width = glow         │  ← 粗描边决定光晕扩散半径
│  ├─ filter: feGaussianBlur      │  ← stdDeviation = blur 属性
│  ├─ opacity: 0.6 (可配置)       │
│  └─ fill-opacity: 0.4           │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  front 层（内核层）             │
│  ├─ stroke-width = 2            │  ← 细描边模拟灯管核心
│  ├─ 无模糊                      │
│  ├─ fill-opacity: 0.4           │
│  └─ opacity: 1 (可配置)         │
└─────────────────────────────────┘
    │
    ▼
  <svg class="neon-surface" viewBox="0 0 W H">
    <defs>
      <filter id="neon-blur">
        <feGaussianBlur stdDeviation="4"/>   ← 仅定义一次，back 层引用
      </filter>
    </defs>
    <g class="neon-back">...</g>
    <g class="neon-front">...</g>
  </svg>
```

### 为什么是双层？

单层模糊会导致整个图形都糊掉，丢失文字的清晰边缘。**back 层只管光晕，front 层只管内核**，两者叠加才接近真实霓虹灯管的视觉效果——你永远能看到灯管中心的亮白核心 + 外围的彩色光晕。

### SVG 形状的坐标变换

SVG 图标的渲染涉及坐标系转换。内联 SVG（如 `viewBox="0 0 24 24" width="48" height="48"`）中的形状元素被提取后，通过 `transform="translate(x, ty) scale(sx, sy)"` 映射到外层 SVG 坐标系中，其中：

- `sx = sw / vbW`，`sy = sh / vbH` — 从 viewBox 到物理尺寸的缩放
- `ty = y - sh / 2` — 垂直居中对齐到文字基线

这意味着无论内联 SVG 的 viewBox 是什么比例，形状都能正确缩放并放置在文字旁边。

---

## 不止文字，SVG 也能发光

`<neon-light>` 支持两种内容：**文字**和**SVG 图标**。把 SVG 直接写在标签内部，它的形状元素（path、circle、rect 等）会自动渲染成霓虹描边：

```html
<neon-light color="#ff69b4" glow="10" font-size="48"
            style="width:700px;height:120px">
  NEON
  <svg viewBox="0 0 24 24" width="48" height="48">
    <circle cx="12" cy="12" r="10"/>
  </svg>
</neon-light>
```

文字和图标按**流式布局**从左到右排列，自动居中。它不限制 SVG 的复杂程度——可以有数百个 path，每个都能独立发光。

---

## 五种动画：CSS @keyframes 的极限玩法

这才是它的灵魂。霓虹灯最迷人的地方就是灯管的"不稳定性"——真实霓虹灯会因为电压波动、灯管老化、接触不良而产生各种不可预测的光效。css-neon 用纯 CSS @keyframes 模拟了五种典型效果：

### flicker（电压波动闪烁）

```
关键帧分布：0% 13% 26% 37% 58% 77% 100% → opacity: 1
           5% 20% 30% 50% 69% 90%      → opacity: 0.25
```

6 秒周期，前后两层使用**不同的关键帧时间点 + 0.15s 相位差**。front 层（内核）先闪，back 层（光晕）滞后 0.15s 跟随——模仿灯管熄灭时先暗芯、后收光晕的物理现象。`step-end` 定时函数确保明暗切换是锐利的，没有平滑过渡，还原高压启辉器的特性。

### breath（呼吸）

```
ease-in-out 正弦式明暗摆动，4 秒周期
front: 1 ← → 0.35
back:  0.75 ← → 0.2（0.2s 相位延迟）
```

看起来简单，但细节决定了真实感：**back 层的最低值（0.2）比 front 层（0.35）更低**。这意味着在"呼气"最暗时，光晕比内核收缩得更厉害——真实霓虹灯在低电压时，光晕确实会先于灯管核心消失。

### glitch（故障艺术）

```css
/* 三组关键帧同时作用 */
animation: neon-glitch       3s step-end,   /* 透明度跳变 */
           neon-glitch-color 3s step-end;   /* 颜色跳变 */
```

这是最复杂的一个。透明度关键帧的密度远超 flicker（15 个关键帧分布在 3 秒内），同时叠加了颜色偏移动画——**stroke 在 inherit / #fff / gold / currentColor 之间高频切换**。不同颜色对应的关键帧时间点互不重叠，产生"颜色撕裂"的视觉效果。这是向 /r/glitch_art 致敬的设计。

### broken（灯管断裂）— SVG 专属

技术含量最高的动画。实现分三步：

1. **形状分类**：遍历 SVG 所有 shape 元素，按 `broken-ratio` 比例用确定性 hash（`djb2` 变体，对 `d` 属性做哈希）将路径分为"正常组"和"断裂组"
2. **per-path 覆盖**：`broken:true` 的路径强制归入断裂组，`broken:false` 强制正常——其余由 ratio 决定
3. **分组渲染**：正常组走完整发光管线，断裂组以 `fill:none` + 独立闪烁 CSS 类渲染——模拟熄灭的灯管段

```html
<!-- 30% 灯管断裂，伴随机闪烁 -->
<neon-light svg-animate="broken" broken-ratio="0.3"
            svg-stroke-width="5">
  <svg><!-- 几百个 path 都没问题 --></svg>
</neon-light>
```

### flow（流光前进）— SVG 专属

基于 `stroke-dashoffset` 动画，但**单层追光会显得单薄**，所以用了三层叠加：

| 层 | opacity | animation-delay |
|----|---------|-----------------|
| L1 | 1.0 | 0s |
| L2 | 0.55 | -0.8/speed s |
| L3 | 0.25 | -1.6/speed s |

三层以不同亮度、不同相位沿路径前进，重叠区域形成"积聚"的高亮段——就像电流真的在灯管里流动，而不是简单的像素滚动。

```html
<neon-light color="#00ccff" svg-animate="flow"
            svg-stroke-width="4">
  <svg><!-- 路径越复杂，流光越好看 --></svg>
</neon-light>
```

### 动画注入机制

所有动画 CSS 在 `_render()` 时动态生成并注入 Shadow DOM：

```js
const animCSS = generateAnimationStyle(cfg.animate, cfg.speed)
  + generateAnimationStyle(textCfg.animate, textCfg.speed)
  + generateAnimationStyle(svgCfg.animate, svgCfg.speed);
```

文字和 SVG 可以**各自独立动画**——比如文字呼吸、SVG 流光，互不干扰。这是配置级联（`text-animate` / `svg-animate`）在动画层面的体现。

---

## Per-Shape：给每一个 Path 指定颜色

SVG 通常由大量 path 组成。css-neon 支持用类似 CSS 的语法，给每个 path 单独指定颜色和破管状态：

```html
<neon-light color="#ffaa00" glow="14"
            svg-animate="broken" broken-ratio="0.5"
            path-config="5739: color:#ff4444, broken:true;
                         5741: color:#4488ff, broken:false">
  <svg>...</svg>
</neon-light>
```

- 按路径 `id` / `p-id` 精确匹配
- 支持 `color` 和 `broken` 两个属性
- 未指定的路径由全局 `broken-ratio` 通过确定性 hash 自动分配

这使得你可以把一朵花的花瓣涂成不同颜色、或者让 Logo 的某一部分刻意"损坏"。

---

## 配置级联：CSS 选手秒懂

css-neon 的属性体系设计借鉴了 CSS 的级联思想：

```
text-* > svg-* > 全局属性 > 默认值
```

- 全局的 `color` 作用于一切
- 想让文字换色？加个 `text-color="..."` 覆盖
- 想让 SVG 独立动画？加个 `svg-animate="..."` 覆盖

三种内容类型（Host / Text / SVG）各自独立解析，互不干扰。

---

## 技术架构：6 个文件，700 行，0 依赖

整个项目的源码组织遵循单一职责原则，每个模块有明确的边界和接口：

```
src/
├── utils.js         # SVG 命名空间、元素创建、类型转换（3 个函数）
├── config.js        # 默认值、观察属性列表、三级配置级联解析
├── animations.js    # 5 种 CSS @keyframes 生成器 + 统一调度接口
├── renderer.js      # 渲染引擎核心：Light DOM 解析、流式布局、
│                    #   双层渲染、per-path 分组、克隆/坐标变换
├── neon-light.js    # Custom Element 类：Shadow DOM 生命周期、
│                    #   ResizeObserver + MutationObserver 双监听
└── index.js         # 入口：自动注册 <neon-light> + 公开 define() API
```

### 依赖图与构建

模块间的依赖关系是单向无环的：

```
utils.js ← config.js ← animations.js ← renderer.js ← neon-light.js ← index.js
```

构建脚本 `build/bundle.js`（不到 80 行）做的事情：

1. 从 `index.js` 出发，正则匹配 `import { ... } from './xxx.js'`
2. **深度优先后序遍历**，得到拓扑排序的依赖序列
3. 按序拼接源文件，**剥离所有 `import` / `export` 关键字**
4. 仅保留 `index.js` 中的 `export { NeonLight, define }` 作为公开 API
5. 写入 `css-neon.js`——**698 行，22 KB（gzip 后 < 8 KB）**

零外部依赖。构建脚本只用了 `fs` 和 `path` 两个 Node.js 内置模块。没有 webpack、没有 rollup、没有 npm install。

### 关键设计决策

**为什么不用 `<use>` 引用？**

早期方案尝试用 `<use href="#id">` 引用内联 SVG 内容，但遇到了 Shadow DOM 的边界——`<use>` 无法跨越 shadow boundary 引用 light DOM 中的元素。因此 renderer 改为**直接克隆每个形状元素**（`cloneShape`），并为每个形状构建独立的 `transform` 矩阵。这虽然增加了元素数量，但保证了 Shadow DOM 封装性和浏览器兼容性。

**为什么 CSS @keyframes 动态注入而不是静态定义？**

`speed` 属性会改变动画周期，而 CSS 变量 `var(--speed)` 在 `animation-duration` 中无法参与 `calc()` 的除法（`calc(4s / var(--speed))` 不被浏览器支持）。解决方案是每次 `_render()` 时用 JS 计算实际时长，拼接为 CSS 字符串注入 Shadow DOM。

**为什么路径分类用 hash 而不是随机？**

`broken` 动画需要按比例将 path 分为"亮"和"暗"两组。如果每次 `_render()` 都用 `Math.random()`，ResizeObserver 触发重渲染时分组会变化，导致灯管断裂位置一直跳。改用基于路径 `d` 属性的 **djb2 哈希**作为随机种子，保证同一 SVG 在任何时候渲染结果一致。

**glow 和 blur 为什么分开？**

```js
// back 层
stroke-width: glow           // 光晕扩散半径（视觉上的"亮"）
filter: feGaussianBlur(blur) // 模糊软度（视觉上的"柔"）
```

两者独立控制：`glow` 决定光晕能扩散多远，`blur` 决定边缘有多柔。大 glow + 小 blur = 锐利的大型光晕（赛博朋克风）；小 glow + 大 blur = 柔和的弥散光（高端品牌风）。如果把两者绑在一起，表现力会大打折扣。

### 双 Observer 实时响应

```js
// ResizeObserver — 尺寸变化自适应
this._observer = new ResizeObserver(() => {
  if (this._svg) this._render();
});
this._observer.observe(this);

// MutationObserver — 动态注入 SVG 实时渲染
this._mutObserver = new MutationObserver(() => {
  if (this._svg) this._render();
});
this._mutObserver.observe(this, { childList: true });
```

这意味着你可以用 JavaScript 在运行时往 `<neon-light>` 里塞东西——`appendChild(svg)`、`setAttribute('color', '#f00')`，组件会自动重渲染，无需手动调用任何方法。

---

## 用 AI 写出来的：Claude Code + DeepSeek V4，一天，不到 5 块钱

这个项目的另一个有趣之处是：**它几乎完全由 AI 编码完成**。

### 开发环境

| 项 | 选择 |
|----|------|
| AI 编程工具 | **Claude Code**（Anthropic 官方 CLI） |
| 模型 | **DeepSeek V4 Pro**（通过 API 接入） |
| 开发周期 | **1 天**（从 idea 到 production-ready） |
| API 花费 | **不到 ¥5（约 $0.70）** |

### 实际开发过程

人做的事情是**设计决策和方向把控**——确定用 Shadow DOM、双层 SVG 渲染、配置级联模型、动画类型。AI 做的事情是**编码实现**——把设计文档翻译成 src/ 下的 6 个模块，处理边界情况，修复 bug，写构建脚本，生成文档。

整个过程中有几次关键的 debug 回合值得一说：

1. **`feGaussianBlur` 在 Safari 上的表现差异**——AI 最初用了嵌套 `<svg>` 作为 light DOM SVG 的容器，但 Safari 对嵌套 SVG 的 filter 继承有特殊处理，导致光晕不显示。解决方案是改为 `<g transform="...">` 分组，直接在外层 SVG 坐标系中操作形状。

2. **broken 效果的三次重构**——第一版用 `stroke-dasharray` 模拟断裂，但 dash 沿路径前进时断裂位置会随路径长度变化，无法控制。第二版改为 `linearGradient` 遮罩，但有渐变方向问题。第三版最终定为**按路径数量分组渲染**——直接将要"损坏"的 path 分离出来，fill 设为 none，套上独立的闪烁动画。效果清晰、表现稳定。

3. **配置级联的优先级 bug**——`broken-ratio` 属性用了 kebab-case，但配置解析函数用 camelCase 去读 `el.getAttribute()`，导致永远读不到值。AI 在 debug 时添加了 `readAttr(el, 'broken-ratio')` 的显式回退逻辑。

4. **构建脚本的 `.js.js` bug**——依赖解析时 `path.join(dir, m[1] + '.js')` 在 import 路径已含 `.js` 的情况下会生成 `neon-light.js.js`。修复为检测后缀后再拼接。

### 使用 AI 编程的真实体验

这不是"AI 一键生成项目"的魔法故事。真实过程是：**人做架构和设计审查，AI 做代码实现和 bug 修复**。Claude Code 的 subagent 模式允许把每个模块作为独立任务派发给 AI，写完一个审查一个，保证了 6 个模块之间的接口一致性。

对于有经验的开发者来说，这种模式的实际价值在于：**把你脑子里已经想好的设计，以最快速度变成可运行的代码**。你不需要亲手写每一行——但你需要在 AI 写完之后判断它写得对不对。

不到 5 块钱的 API 费用换来一个从零到 GitHub Release 的开源项目，这个投入产出比在一年前是不可想象的。

---

## 可以用在哪些地方？

### 1. 品牌 Landing Page
首屏标题用 `<neon-light>` 替代静态文字，配合 glitch 或 breath 动画，视觉冲击力远超普通排版。无需框架，直接塞在 HTML 里就能跑。

### 2. 电子音乐 / 游戏宣传页
赛博朋克、蒸汽波、合成器浪潮……这些视觉风格的核心元素就是霓虹灯。css-neon 天生适配这些场景。

### 3. 嵌入式图标
把 SVG 图标（Font Awesome、Heroicons 等）放入 `<neon-light>`，给常规 UI 控件加上霓虹发光效果——导航栏、按钮、状态指示器，都可以。

### 4. 数字艺术 / Creative Coding
结合 JavaScript 动态修改属性，可以实现交互式霓虹装置。per-path 配置让每个形状独立发光，适合生成艺术和可视化。

### 5. 低代码平台组件库
`<neon-light>` 是标准 Custom Element，可以在任何支持 HTML 的低代码平台中直接使用——拖一个标签、配几个属性，效果就出来了。

---

## 快速上手

```html
<!-- 1. 引入 -->
<script type="module" src="css-neon.js"></script>

<!-- 2. 使用 -->
<neon-light color="#ff69b4" glow="12" font-size="64"
            style="width:600px;height:120px">
  你好，霓虹灯
</neon-light>
```

就是这么简单。不需要 npm install、不需要 webpack 配置、不需要 CSS 知识。

---

## 开源

MIT 协议，GitHub 地址：[github.com/wphmoon/css-neon](https://github.com/wphmoon/css-neon)

欢迎 Star、Issue、PR。
