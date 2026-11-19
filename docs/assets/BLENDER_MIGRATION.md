# Blender 资产流程迁移与本机续作

状态：**规则已修订，本机生产尚未执行，不能视为迁移验收完成。**
本轮仅允许使用用户电脑的 Blender。当前会话连接的是云端
`/workspace/Pixel-Paws`，云端可执行文件为 `/usr/bin/blender`，版本
4.3.2；没有发现用户电脑的文件系统、终端或 Blender 连接。
用户已明确拒绝用云端 Blender 代替。未在云端执行 bpy 建模、导入、
导出、渲染或资产几何验证。系统 Python 没有 bpy 不代表 Blender 自带
Python 没有 bpy；本机能力必须由本机执行通道确认。

## 已完成的项目定位

| 用途 | 实际路径 |
| --- | --- |
| 项目规则 | `AGENTS.md` |
| 持久化项目 skill | `.agents/skills/cozy-lowpoly-assets/SKILL.md` |
| 风格、尺寸、场景、清单、验证指南 | `docs/assets/` |
| 批准的原始马克杯 | `src/assets/models/mug.glb` |
| 原始几何报告 | `src/assets/asset-spec.json` |
| 历史马克杯生成器 | `src/assets/generators/generate-mug.mjs` |
| 安全复现历史参考 | `scripts/reproduce-mug.mjs` |
| GLB 解析与实例化 | `src/assets/load-assets.js` |
| 资产注册、碰撞体描述 | `src/assets/asset-manifest.json` |
| 实际游戏实例、缩放和初始姿态 | `src/scenes/study-desk-gameplay.scene.json` |
| 桌面资产检查布局 | `src/scenes/study-desk-preview.scene.json` |
| 游戏场景入口 | `src/assets/study-scene.js` |
| 游戏灯光、相机和渲染器 | `src/app.js` |
| 现有 Rapier 适配器 | `src/physics/physics-body.js`、`src/physics/desk-physics.js` |
| 现有检查预览 | `scripts/asset-review/main.js`、`tools/asset-viewer/` |
| 本机能力探测脚本 | `scripts/blender/probe.py` |

项目 skill 直接在仓库 `.agents/skills/` 原位持久化，通过 `AGENTS.md`
引用；未写入云端只读的全局技能目录，也未另建同名个人 skill。
工作分支为 `feat/blender-asset-pipeline`；开始时 `work` 分支工作区干净。

## 马克杯基准：已由现有 Three.js 加载器测量

以下是原始文件/Three.js 检查结果，**不是 Blender 导入或视觉验收结果**。

- 文件 78,852 字节；SHA-256
  `e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e`。
- 原生宽 × 高 × 深：
  `0.11909234523773193 × 0.09600000083446503 × 0.08799999952316284 m`。
- 边界：min `[-0.04399999976158142, 0, -0.04399999976158142]`，
  max `[0.07509234547615051, 0.09600000083446503, 0.04399999976158142]`。
- glTF 原始节点无显式 TRS/matrix，使用单位变换。根节点
  `Cloud Paw Mug`，子节点为
  `Ceramic body, rolled rim, inner bowl and solid handle` 与
  `Raised paw emblem`。加载器保留历史文字 pivot 的兼容转换。
- 米制，Y-up；原点在杯体底心，手柄使完整 AABB 向 +X 偏移；
  正面爪印朝 +Z，手柄朝 +X。不得改为完整 AABB 底心或 -Z 正面。
- 612 三角形，1,836 位置顶点，两个材质，无纹理。
  蓝色陶瓷与暖色杯沿使用线性顶点色；白色基础材质 roughness 0.65；
  奶油色爪印材质 roughness 0.70；metalness 均为 0，未开启双面。
- 从历史生成器确认：12 段旋转杯体、真实内壁/底厚、卷口；8 段曲线
  手柄、6 边截面；独立凸起爪印，三角面法线，隐藏陶瓷接头有意重叠。
  这些是源代码事实，仍待本机 Blender 检查内外壁和接头。
- manifest `visualScale=[1,1,1]`。保守 box collider 中心
  `[0.015546172857284546,0.04800000041723251,0]`，
  halfExtents `[0.05954617261886597,0.04800000041723251,0.04399999976158142]`。
  该代理填满杯腔和把手孔，不能作为精确碰撞几何。

通过 `instantiateAssetLayout`、`parseGlb` 和
`Box3.setFromObject(object3D, true)` 测量加载后世界顶点边界：

| 实例 | 实例缩放 | 实际宽 × 高 × 深（m，四舍五入） |
| --- | --- | --- |
| 检查布局的马克杯 | 1 | 0.119092 × 0.096000 × 0.088000 |
| 游戏 `preview-mug-on-desk` | 3.6 | 0.428732 × 0.345600 × 0.316800 |
| 游戏 `mug-2` | 4.2 | 0.500188 × 0.403200 × 0.369600 |
| 游戏 `mug-3` | 4.8 | 0.571643 × 0.460800 × 0.422400 |
| 游戏 `mug-4` | 5.4 | 0.643099 × 0.518400 × 0.475200 |
| 游戏 `mug-5` | 6 | 0.714554 × 0.576000 × 0.528000 |

不能只看原生 GLB 就声称已核对游戏尺寸。橡皮擦后续必须记录明确的
原生长宽高、manifest W/H/D 顺序、采用哪一个游戏实例作比例参照，
以及检查布局的实例缩放；本轮没有制作或指定已验收橡皮擦。

## 本机执行准备与后续计划

在用户电脑的 Codex 中打开同一项目或使用可用的本机接管功能，确认
能读取原始项目及未提交修改，再转移本分支改动。不要通过上传一个
报告文件来宣称已建立可执行的本机连接。

1. 读取本机 `AGENTS.md`、本 skill 和本机 git 状态。发现真实 Blender
   可执行路径，运行 `--version`，再在本机仓库根目录运行：

   ```sh
   blender --background --factory-startup --python-exit-code 1 --python scripts/blender/probe.py -- --report work/blender-capabilities.json
   ```

   `blender` 只是示例命令；使用本机发现的真实路径。脚本只记录实际
   binary、hostname、版本和 glTF operator API，不修改任何模型。
   本脚本目前只经过 Python 语法检查和缺失 bpy 的失败路径检查；
   Blender 内的成功路径仍待本机执行。
2. 校验原始 GLB 哈希，复制/导入本机 Blender 的参考场景，保存参考
   `.blend`，不重新导出覆盖原始 GLB。测量轴转换后的尺寸、节点和
   材质，渲染游戏轴正面 +Z、右侧 +X、顶部 +Y 的三视图。
3. 在 `src/assets/generators/` 编写版本匹配的 bpy 建模/导出脚本，建立
   一个共享 authoring 配置，集中尺寸、sRGB 色板、线性转换、材质、
   倒角和导出参数。保留参数化接口，本轮只添加 `eraser`。
   该脚本与配置尚未创建，不能将探测脚本当成建模/导出脚本。
4. 按现有风格确定橡皮擦的明确尺寸和配色，保存可编辑
   `src/assets/blender/eraser.blend`，先导出到 `work/`。区分实体、
   有厚度空心壳、开放薄片，检查修改器求值后的退化面、重复面、
   意外穿插、法线、闭合性/厚度和负缩放。固定随机种子并记录版本。
5. 在新 Blender 场景重导入 GLB，再用项目加载器检查尺寸、朝向、
   节点/父子关系、可动枢轴和材质。保留独立部件；禁止盲目应用
   层级/动画变换，禁止用全局双面掩盖反面。比较固定版本下独立
   运行的几何、节点、材质结果；字节不一致要解释而非覆盖基准。
6. 通过现有 manifest 注册 `eraser`，最终 GLB 才放入
   `src/assets/models/eraser.glb`；在独立检查布局中与马克杯同屏。
   不批量生成清单，不改玩法、触控、计分或 Rapier 配置。
7. 在实际 `src/app.js` 环境检查视觉。游戏使用默认色调映射、
   Hemisphere `#dff7ff/#11252e` 强度 1.4、Directional `#ffe1a8`
   强度 1.4（位置 `[6,10,4]`）及约 50° 跟随正交相机。
   现有检查器使用其他光照和 ACES，不能用它代替实际游戏检查。
   另按风格指南检查 65/70/75° 和 390×844、360×800。
8. 分别报告自动检查、人工视觉待确认和实际阻塞，运行项目要求的
   验证、历史马克杯隔离复现、测试及构建，检查源文件没有进入包体。

## 当前验收边界

已执行：原始 GLB 结构、哈希、实际加载尺寸与节点/材质读取；
历史隔离复现；项目测试；探测脚本语法和缺失 bpy 失败路径。
本分支验证结果：`npm run assets:validate` 通过（4 个资产、3 个布局、
9 个实例）；`npm test` 83/83 通过；`npm run build` 通过；
`npm run assets:reproduce:mug` 两次隔离结果均与批准哈希相同。
Khronos 检查马克杯为 0 errors、0 warnings、2 条无害 unused-UV info。
`git diff --check` 通过。日志位于忽略目录 `work/`，不作为资产包内容。

尚未执行：本机 Blender 能力探测、参考导入/三视图、Blender 几何
检查、样板建模/导出/重导入、橡皮擦注册与同屏视觉检查。
因此不存在本轮橡皮擦输出或已通过的 Blender 自动/人工验收结果。
