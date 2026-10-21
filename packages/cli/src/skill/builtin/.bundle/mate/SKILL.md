---
name: mate
description: 创建自定义桌面宠物（Mate）角色，包含精灵图与 manifest。当用户要求「创建宠物」「做一个桌面伙伴」「设计一个 mate 角色」「为我的宠物生成精灵图」，或想定制自己的桌面伙伴时使用。生成 WebP 精灵图 + manifest.json，可由 MiMo Desktop 的 Mate 系统加载。 | Create a desktop pet character with spritesheet and manifest for MiMo Desktop.
---

# Mate 桌宠创建器

为 MiMo Desktop 的 Mate（桌面伙伴）系统创建有动画的桌面宠物角色。

## 输出结构

一个有效的自定义宠物位于如下结构的文件夹中：

```
<pet-id>/
├── manifest.json     # Required — animation metadata
└── spritesheet.webp  # Required — all animation frames in a grid
```

用户把这个文件夹放进 MiMo Desktop 的自定义宠物目录（`userData/pets/<pet-id>/`），然后在 设置 → Mate 中点击「Refresh」加载它。

## manifest 结构

```json
{
  "id": "my-pet",
  "name": "My Pet",
  "description": "A cute custom pet",
  "version": 1,
  "spritesheet": "spritesheet.webp",
  "frameWidth": 240,
  "frameHeight": 240,
  "columns": 8,
  "totalFrames": 16,
  "animations": {
    "idle": { "row": 0, "frames": 8, "fps": 8, "loop": true }
  }
}
```

### 必填字段

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `id` | string | 唯一标识符（kebab-case） |
| `name` | string | 显示名称 |
| `version` | number | 始终为 `1` |
| `spritesheet` | string | 精灵图文件名 |
| `frameWidth` | number | 每帧宽度（像素） |
| `frameHeight` | number | 每帧高度（像素） |
| `columns` | number | 精灵图网格的列数 |
| `totalFrames` | number | 所有动画的帧总数 |
| `animations` | object | 至少必须包含 `idle` |

### 可选字段

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `description` | string | 在设置界面中显示 |
| `anchorX` | number | 用于居中的水平锚点（0–1，默认 0.5） |

### 动画定义

每个动画条目：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `row` | number | 精灵图中的行索引（从 0 开始） |
| `frames` | number | 该动画的帧数 |
| `fps` | number | 播放速度（建议 6–12） |
| `loop` | boolean | 动画是否循环 |

`idle` 动画是**必需的**——宠物加载时默认播放它。

## 精灵图布局

- 帧按网格从左到右、从上到下排列。
- 每行对应一个动画（通过动画定义中的 `row` 字段匹配）。
- 所有帧必须尺寸一致（`frameWidth × frameHeight`）。
- 需要透明背景（alpha 通道）——宠物窗口没有背景。
- 建议帧尺寸：240×240 px（在桌面 1× 缩放下渲染良好）。
- 格式：带透明度的 WebP（无损或近无损，以保持像素画清晰）。

## 工作流

### 第 1 步：理解角色

询问用户：
- 什么动物/生物/角色？
- 美术风格偏好（像素画、卡通、扁平矢量、kawaii）？
- 有特定的颜色或特征吗？

### 第 2 步：生成精灵图

使用 `imagegen` 技能生成精灵图。按以下准则构造提示词：
- 要求生成**sprite sheet**，并指定网格布局（例如「8 帧排成一行，每帧 240×240 像素」）
- 指定**透明背景**（alpha 通道）
- 描述 **idle 动画**的动作：轻柔呼吸、眨眼、摇尾巴、上下浮动等
- 让角色在每帧中保持**居中**且尺寸一致
- 风格：与用户偏好一致；未指定时默认可爱/kawaii

如果生成的图片已经是 WebP，直接使用。如果是 PNG 或其他格式，转换为 WebP：

```bash
# Convert to lossless WebP preserving transparency
cwebp -lossless -q 100 spritesheet.png -o spritesheet.webp
```

如果 `cwebp` 不可用，检查 `sips`（macOS Ventura+ 支持 WebP 导出）：

```bash
sips -s format webp spritesheet.png --out spritesheet.webp
```

如果两个工具都不可用，指导用户安装其一：

```
brew install webp   # provides cwebp
```

不要悄悄把 PNG 改名为 .webp——文件必须是有效的 WebP 编码（RIFF/WEBP 头）。如果确实无法完成转换，就明确失败，并告诉用户需要安装什么工具。

如果 `imagegen` 不可用（技能未启用或图片生成失败），退而直接用 SVG 生成像素画帧，再栅格化。从 manifest 计算尺寸：

```bash
# Calculate actual spritesheet dimensions from manifest
WIDTH=$((frameWidth * columns))
HEIGHT=$((frameHeight * rows))  # rows = max animation row index + 1

# Rasterize SVG to PNG, then convert to WebP
rsvg-convert -w $WIDTH -h $HEIGHT spritesheet.svg -o spritesheet.png
cwebp -lossless spritesheet.png -o spritesheet.webp
```

作为最后手段，直接输出 SVG 文件，并指导用户手动转换。

### 第 3 步：编写 manifest

生成 `manifest.json`，其尺寸必须与实际输出的精灵图一致。核对：
- `frameWidth × columns` = 精灵图总宽度
- `frameHeight × (max animation row index + 1)` = 精灵图总高度
- `animations.idle` 存在，且 `row`、`frames`、`fps`、`loop` 均有效
- 每个动画的 `frames` ≤ `columns`（每行帧数不能超过网格列数）

### 第 4 步：交付

把两个文件写到当前工作目录下以宠物 ID 命名的文件夹中。告诉用户：
1. 把该文件夹复制到他们的 MiMo Desktop 宠物目录（设置 → Mate → 点击「Open Folder」可找到它）
2. 在 设置 → Mate 中点击「Refresh」
3. 从列表中选择新宠物

## 约束

- `idle` 动画必须存在——系统会回退到它。
- 帧尺寸必须在整张精灵图中保持一致。
- 总文件大小保持在 2MB 以内，以便流畅加载。
- 宠物 ID 必须唯一；如果与预设（`koala`、`panda`）冲突，预设优先。
- 不要引用或依赖任何外部 URL——所有资源都必须是本地文件。
