# Blog Monorepo 仓库优化任务清单

> 这是当前优化周期的主任务文件，用于持久化保存全局鸟瞰结论、当前任务、后续深挖入口。

## 一、这份文件是做什么的

这不是最终整改方案，也不是某一个端的详细改造设计。

这份文件的用途是：

- 保存当前阶段已经确认的全局结论
- 记录当前可以执行的任务
- 约束后续分析和优化的边界
- 作为后续继续拆分任务时的单一入口

## 二、当前阶段说明

当前阶段仍然是：

- **全局鸟瞰分析阶段**

这意味着：

- 目前已经完成的是仓库级别的总体盘点
- 还没有完成 Blog、Admin Client、Admin Server 三个端的深入专项分析
- 后续必须在全局结论之上，按职责边界分别继续深入

## 三、当前优化约束

- 本轮优化只针对**现有系统**，不做新功能扩展
- 当前先执行 `A + B`
- 后续再进入 Blog / Admin Client / Admin Server 的深挖分析
- `auth/session/public-routes` 是当前服务端认证系统设计，**不纳入改造任务**
- 部署相关任务本阶段先排除，不写入当前执行清单

## 四、当前任务总览

| 编号 | 工作流            | 优先级 | 当前状态 | 任务名称                                       | 说明                                                                                               |
| ---- | ----------------- | ------ | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A-01 | 仓库治理          | P0     | 已完成   | 建立根级 `AGENTS.md`                           | 给整个 monorepo 建立统一规则入口                                                                   |
| A-02 | 仓库治理          | P0     | 已完成   | 规范根目录文件放置                             | 把散落在根目录的说明性文件收口到 `docs/`                                                           |
| A-03 | 仓库治理          | P0     | 已完成   | 建立 `docs` 总索引                             | 让全局文档和应用文档有统一入口                                                                     |
| A-04 | 仓库治理          | P1     | 已完成   | 重写根 `README.md`                             | 改成 monorepo 导航页，而不是单一项目介绍页                                                         |
| A-05 | 仓库治理          | P1     | 已完成   | 清理仓库卫生问题                               | 清理 `.DS_Store`、被跟踪的运行态文件等问题                                                         |
| A-06 | 仓库治理          | P0     | 已完成   | 建立仓库级测试基线                             | 补齐根级测试入口、最小测试矩阵与验证顺序                                                           |
| A-07 | 仓库治理          | P0     | 已完成   | 建立仓库级 CI 质量门禁                         | 自动化执行安装、Lint、关键测试与关键构建                                                           |
| A-08 | 仓库治理          | P0     | 已完成   | 收敛环境变量 contract 与 Turbo env             | 统一多端 env 入口与缓存感知配置                                                                    |
| A-09 | 仓库治理          | P1     | 已完成   | 收敛根工作区依赖与工程依赖                     | 减少根层运行时依赖污染与版本漂移误导                                                               |
| A-10 | 仓库治理          | P1     | 已完成   | 修复 Husky 与 commit 流程                      | 去掉过时钩子写法并补齐 commitlint 链路                                                             |
| A-11 | 仓库治理          | P1     | 已完成   | 统一 ESLint 9 与 flat config                   | 收敛工作区 ESLint 版本，并让 Blog 对齐 Next 官方推荐配置                                           |
| A-12 | 仓库治理          | P1     | 进行中   | 推进工程配置文件模块格式现代化                 | 按官方现代推荐方向收敛 `.js` / `.mjs` / `.cjs`、ESM/TS 与 Tailwind CSS-first 策略                  |
| A-13 | 仓库治理          | P0     | 进行中   | 收敛环境变量文件数量与 Prisma CLI 官方化加载   | 统一采用 `.env` / `.env.development` / `.env.production`，并移除 `dotenv-cli` 对 Prisma 命令的依赖 |
| B-01 | 共享基础层        | P0     | 已完成   | 收敛 Prisma 统一入口                           | 统一通过 `@blog/db` 使用 Prisma                                                                    |
| B-02 | 共享基础层        | P0     | 已完成   | 梳理 `@blog/shared` 边界                       | 明确哪些类型属于跨端共享契约                                                                       |
| B-03 | 共享基础层        | P1     | 已完成   | 梳理 `@namelesserlx/editor` 来源策略           | 判断编辑器能力在仓库内外的维护边界                                                                 |
| B-04 | 共享基础层        | P1     | 已完成   | 盘点版本漂移                                   | 梳理 workspace 内核心依赖版本不一致问题                                                            |
| B-05 | 共享基础层        | P1     | 已完成   | 盘点脚本入口一致性                             | 明确哪些命令才是仓库级标准入口                                                                     |
| B-06 | 共享基础层        | P0     | 已完成   | 升级 Prisma 到最新版本并迁移到 Prisma 7 新写法 | 升级到官方最新版本并完成生成、配置、导入链路迁移                                                   |
| B-07 | 共享基础层        | P1     | 进行中   | 推进 `@blog/shared` 导出面治理                 | 从单一大入口继续收敛成更稳定的共享边界                                                             |
| B-08 | 共享基础层        | P1     | 已完成   | 推进 `@namelesserlx/editor` npm 包落地         | 统一 Blog 与 Admin Client 的 npm 包消费方式                                                        |
| B-09 | 共享基础层        | P1     | 进行中   | 推进 `@blog/config` 实际落地                   | 让共享工程配置真正成为各应用的规范源                                                               |
| B-10 | 共享基础层        | P1     | 进行中   | 补齐共享包测试与构建验证                       | 为 shared/db/config 建立最小验证层                                                                 |
| C-01 | Blog 深挖         | P1     | 暂缓     | Blog 职责边界深入分析                          | 待 A+B 稳定后执行                                                                                  |
| D-01 | Admin Client 深挖 | P1     | 暂缓     | 后台前端职责边界深入分析                       | 待 A+B 稳定后执行                                                                                  |
| E-01 | Admin Server 深挖 | P1     | 暂缓     | 后台服务端职责边界深入分析                     | 待 A+B 稳定后执行                                                                                  |

## 五、当前明确可执行的任务：A. 仓库治理

### A-01 建立根级 `AGENTS.md`

**任务目的**

给整个仓库建立统一规则入口，避免后续分析和改造继续分散在口头约定、临时说明和子目录文档中。

**要解决的问题**

- 仓库根目录没有统一规则文件
- 没有定义根目录该放什么、不该放什么
- 没有定义 `docs/` 与 `apps/*/docs/` 的边界
- 没有定义共享包的使用约束

**预期产物**

- 根目录新增 `AGENTS.md`

**应写入的内容**

- 仓库整体结构说明
- `apps/blog`、`apps/admin/client`、`apps/admin/server`、`packages/*` 的职责说明
- 根目录文件放置规则
- 文档放置规则
- 当前优化周期只做“现有系统优化”的限制
- 后续分析必须先全局、再分端深入的工作方法

**当前状态**

- 已完成

---

### A-02 规范根目录文件放置

**任务目的**

把当前散落在根目录的说明性文件收回到统一文档体系中，降低根目录噪音。

**当前已发现的问题**

- 根目录存在说明文档直接裸放
- 例如：
    - `MEILISEARCH_QUICKSTART.md`
    - `MEILISEARCH_SETUP.md`
    - `JENKINS_CICD_UPDATES.md`

**预期产物**

- 根目录只保留项目入口类文件与核心配置文件
- 说明性文档移动到 `docs/` 下的合理位置
- 必要时补充文档分类目录

**当前状态**

- 已完成

---

### A-03 建立 `docs` 总索引

**任务目的**

让现有文档可查、可维护、可扩展，而不是“有 docs 目录但没有文档地图”。

**要解决的问题**

- `docs/` 已存在，但没有首页
- 全局文档和应用文档的边界不清
- 历史文档、草案文档、执行中任务文档没有统一入口

**预期产物**

- 新增 `docs/README.md` 或等价索引文件

**索引中应包含**

- 全局架构类文档
- 全局任务类文档
- 历史/废弃类文档
- 各应用自己的 `docs` 文档入口

**当前状态**

- 已完成

---

### A-04 重写根 `README.md`

**任务目的**

把根 README 从“泛项目介绍”升级为“仓库导航首页”。

**要解决的问题**

- 当前 README 更像总介绍，不像 monorepo 导航页
- 对三端职责、共享包职责、文档入口、关键命令入口说明不够清楚

**预期产物**

- 根 `README.md` 改写为仓库导航页

**应包含的内容**

- 仓库结构概览
- 三个端分别负责什么
- `packages/*` 分别负责什么
- 文档入口
- 关键开发命令入口
- 当前任务文件入口

**当前状态**

- 已完成

---

### A-05 清理仓库卫生问题

**任务目的**

减少明显不该进入仓库的文件和状态，提升仓库基础整洁度。

**当前已发现的问题**

- 仓库中存在 `.DS_Store`
- 存在被跟踪的运行态/本地环境文件
- 根目录与子目录文件噪音偏多

**预期产物**

- 清理不应被版本控制的无效文件
- 记录哪些文件是历史遗留，哪些要停止继续跟踪
- 仓库根目录更干净

**当前状态**

- 已完成
- 已完成文档与根目录结构收口
- 已将被跟踪的 `.env*` 文件从版本控制中移除，仅保留本地工作树文件

---

### A-06 建立仓库级测试基线

**任务目的**

补齐根级测试入口和最小测试矩阵，让后续优化不再只依赖手工验证。

**当前已发现的问题**

- 根目录没有统一的 `test` 脚本入口
- 当前测试几乎集中在 `apps/admin/server/tests`
- Blog、Admin Client、共享包都缺少仓库级统一测试视角
- 后续三端和共享包的优化缺少明确的回归基线

**预期产物**

- 根目录新增统一测试入口脚本
- 明确最小测试矩阵与执行顺序

**当前状态**

- 已完成
- 根目录已补充统一测试入口
- 当前最小测试矩阵已记录到 `docs/repository/test-baseline.md`

---

### A-07 建立仓库级 CI 质量门禁

**任务目的**

把已经确定好的仓库级校验自动化放到 CI 上，形成稳定的提交与合并门禁。

**当前已发现的问题**

- 仓库里没有 `.github/workflows`
- 当前安装、Lint、测试、关键构建都依赖手工执行
- 后续优化任务缺少统一的自动化回归入口

**CI 在这个项目里要做什么**

- 安装依赖并恢复缓存
- 执行根级 `lint`
- 执行仓库级最小测试矩阵
- 执行关键构建，至少覆盖会阻断其他应用的共享包和关键应用
- 在 PR / push 时给出明确的通过或失败反馈

**预期产物**

- 最小可用的 CI 工作流
- 明确哪些检查是必跑项，哪些是可选项
- 让后续仓库优化能以自动化校验为基础继续推进

**当前状态**

- 已完成
- 已落地仓库级 CI 工作流，当前执行 `pnpm ci:quality`
- 当前门禁已覆盖 `lint`、基线测试、共享包关键构建，以及 `build:server`、`build:blog`、`build:admin`
- 全量 `lint` 已可执行通过，当前剩余问题以 warning 为主，留待后续分端专项继续清理

---

### A-08 收敛环境变量 contract 与 Turbo env

**任务目的**

把 Blog、Admin Client、Admin Server、`@blog/db` 的环境变量入口收成统一约定，降低“某环境能跑、某环境不能跑”的风险。

**当前已发现的问题**

- Blog、Admin Client、Admin Server、`@blog/db` 各自维护不同的 env 入口
- `turbo.json` 的 `globalEnv` 与当前真实环境变量使用情况不完全一致
- 存在 `NEXTAUTH_*` 等历史配置残留

**预期产物**

- 一份仓库级 env contract
- 更新后的 `turbo.json` env 感知配置
- 明确哪些变量属于根级共享，哪些变量只属于单应用

**当前状态**

- 已完成
- 仓库级 env contract 已记录到 `docs/repository/environment-contract.md`
- `turbo.json` 已移除历史 `NEXTAUTH_*` 残留，并补齐当前构建相关 env 感知配置

---

### A-09 收敛根工作区依赖与工程依赖

**任务目的**

降低根工作区的运行时依赖污染，让根包回到“工程编排层”定位。

**当前已发现的问题**

- 根 `package.json` 仍保留 `react`、`react-dom`、`axios`、`dayjs`、`@prisma/client` 等运行时依赖
- 这些依赖会放大版本漂移，也容易误导后续维护者对根层职责的理解

**预期产物**

- 一份根工作区依赖分类清单
- 一次运行时依赖与工程依赖的收敛
- 明确哪些依赖必须留在根层，哪些应下沉到应用或共享包

**当前状态**

- 已完成
- 根工作区依赖分类清单已记录到 `docs/repository/root-workspace-dependencies.md`
- 根 `package.json` 中未被实际消费的运行时依赖已移除

---

### A-10 修复 Husky 与 commit 流程

**任务目的**

让提交门禁真正稳定生效，避免过时钩子和半生效的 commit 规范继续累积隐患。

**当前已发现的问题**

- `pre-commit` 仍使用 Husky 的旧写法
- `commit-msg` 钩子目前没有真正承接 `commitlint`
- 提交流程已经出现弃用提示

**预期产物**

- 更新后的 Husky 钩子配置
- 生效的 `commitlint` 提交流程
- 一份与 `AGENTS.md` 一致的提交门禁说明

**当前状态**

- 已完成
- `pre-commit` 已移除 Husky 旧写法
- `commit-msg` 已补齐 `commitlint` 执行链路
- 根 `prepare` 脚本已切换为 Husky 9 的当前写法 `husky`

---

### A-11 统一 ESLint 9 与 flat config

**任务目的**

将仓库内分裂的 ESLint 版本和配置体系收敛到 ESLint 9 + flat config，先统一工程层版本，再逐步处理各应用现有 lint 债务。

**当前已发现的问题**

- 根目录仍停留在旧 `.eslintrc` 体系
- Blog 与 Admin Client 虽已使用 flat config，但版本和配置方式不一致
- Blog 的 Next ESLint 配置没有完整对齐官方推荐的 `core-web-vitals + typescript + globalIgnores`
- `@blog/config` 还没有真正承接 ESLint 共享配置能力

**预期产物**

- 工作区统一使用 ESLint 9 最新版本
- 根目录迁移到 flat config
- Blog 对齐 Next 官方推荐配置，并补充与工程配置文件兼容的最小覆盖层
- 为后续把 ESLint 逐步接入 `@blog/config` 留出统一基础

**当前状态**

- 已完成
- 根目录、Blog、Admin Client、`@blog/config` 已统一到 ESLint 9 最新版本
- 根级 `.eslintrc.js` 已移除，改为 `eslint.config.mjs`
- Blog 已切换到 `eslint-config-next/core-web-vitals + eslint-config-next/typescript + eslint-config-prettier/flat`
- 已补充工程配置文件的兼容规则，并完成 Blog / Admin Client 的 lint error 收敛
- 全量 `lint` 已纳入质量门禁，当前剩余为 warning 级别债务，后续按端继续清理

---

### A-12 推进工程配置文件模块格式现代化

**任务目的**

在不盲目追求“全部改成 ESM”的前提下，按各工具官方现代推荐方向，逐步收敛仓库内工程配置文件的模块格式和配置形态。

**当前已确认的基础认知**

- `.js` 是普通 JavaScript 文件，最终按 `ESM` 还是 `CommonJS` 解析，通常取决于工具加载方式与 `package.json#type`
- `.mjs` 明确表示该文件按 `ESM` 解析
- `.cjs` 明确表示该文件按 `CommonJS` 解析
- 模块后缀的选择首先是“加载语义是否明确”，而不是“哪一种更先进”

**官方调研结论**

- Next.js 官方同时支持 `next.config.js`、`next.config.mjs` 与 `next.config.ts`
- Prettier 官方同时支持 `module.exports` 与 `export default`
- commitlint 官方文档默认示例偏向 `ESM`，但也明确支持 `CommonJS`
- Tailwind CSS 4 的现代方向不只是 `ESM`，而是进一步走向 `CSS-first configuration`

**当前已发现的问题**

- 仓库内仍混用 `.js`、`.mjs` 与 `CommonJS`
- 部分文件保留 `CommonJS` 只是为了兼容和低风险，并不代表当前形态最优
- 如果没有明确边界，后续很容易演变成“为了 ESM 而 ESM”，导致迁移成本和收益失衡

**预期产物**

- 一份工程配置文件模块格式收敛策略
- 明确哪些文件应优先迁到 `ESM` 或 `TypeScript`
- 明确哪些文件应继续保留 `CommonJS`
- 对 Tailwind 4 单独评估是否要从 JS 配置进一步收敛到 `CSS-first`

**建议优先级**

- 第一优先：
    - `commitlint.config.js` -> `commitlint.config.mjs`
    - 根 `.prettierrc.js` -> `.prettierrc.mjs`
    - `apps/blog/.prettierrc.js` -> `.prettierrc.mjs`
- 第二优先：
    - `apps/blog/next.config.js` -> `next.config.ts` 或 `next.config.mjs`
- 单独评估：
    - `apps/blog/tailwind.config.js` 不简单按“改 ESM”处理，而是结合 Tailwind 4 官方方向评估 `CSS-first`

**当前状态**

- 进行中
- 已将根级 `Prettier` 配置统一为单一 `.prettierrc.mjs`，并移除 Blog / Admin Client 的局部配置文件
- 已将 `commitlint.config.js` 迁移为 `commitlint.config.mjs`
- 已将 `apps/blog/next.config.js` 迁移为 `next.config.mjs`
- Tailwind 4 的 `CSS-first` 方向暂不执行，只保留在后续评估范围内

---

### A-13 收敛环境变量文件数量与 Prisma CLI 官方化加载

**任务目的**

按官方更常见的用法，把环境变量文件收敛到 `.env`、`.env.development`、`.env.production` 这三个主文件，并让 Prisma CLI 回到 Prisma 7 官方推荐的“在 `prisma.config.ts` 内加载 dotenv”方向，而不是继续依赖 `dotenv-cli` 包装脚本。

**当前已发现的问题**

- `packages/db/package.json` 里的 Prisma 命令仍依赖 `dotenv-cli`
- 上一版引入了 `.env.shared*` 与多层合并逻辑，复杂度偏高
- 当前更适合先收回到官方默认更接近的模式
- Prisma CLI 仍应改为官方推荐的 `dotenv` 导入方式

**方案结论**

- 环境变量文件先收敛为：
    - `.env`
    - `.env.development`
    - `.env.production`
- 暂不引入 `.env.local`、`.env.*.local`、`.env.shared*`
- 各应用继续按各自工具官方方式读取环境变量，不额外叠加自定义分层

**预期产物**

- `Prisma CLI` 不再依赖 `dotenv-cli`
- `prisma.config.ts` 按官方方式加载 `.env`，并在需要时补充 `.env.development` / `.env.production`
- Admin Server 只加载应用目录下的 `.env` 与 `.env.${NODE_ENV}`
- Blog 回到 Next 官方默认 `.env*` 加载方式，不增加额外 loader
- `environment-contract.md` 明确记录当前仅使用三类主文件

**当前状态**

- 进行中
- 已撤回 `.env.shared*` 方向
- 当前执行范围限定为 `@blog/db`、Admin Server、Blog 的 env 加载收敛
- Tailwind、前端公开变量、部署注入策略不在本轮改动内

## 六、当前明确可执行的任务：B. 共享基础层

### B-01 收敛 Prisma 统一入口

**任务目的**

把 Prisma 的使用方式统一到 `@blog/db`，避免不同应用、不同 service 各自初始化客户端。

**当前已发现的问题**

- 仓库里已经有 `@blog/db`
- 但部分服务代码仍直接 `new PrismaClient()`
- 这会导致连接管理、日志、错误处理和后续治理不一致

**预期产物**

- 确认 Prisma 的唯一入口是 `@blog/db`
- 列出所有绕过统一入口的文件
- 后续进入专项实施时，按清单逐步收敛

**当前状态**

- 已完成
- 已补充结构回归测试，确保相关 service 不再直接实例化 `PrismaClient`

---

### B-02 梳理 `@blog/shared` 边界

**任务目的**

明确哪些内容属于跨端共享契约，哪些内容不应该进入共享层。

**当前已发现的问题**

- `@blog/shared` 已经承担大量跨端类型
- 但仍需要进一步区分：
    - 真正跨端共享的接口契约
    - 应该留在应用内的局部类型
    - 不应进入共享层的展示/页面语义

**预期产物**

- 一份 `@blog/shared` 边界说明
- 一份“保留共享 / 应迁出共享 / 暂不处理”的分类结果

**当前状态**

- 已完成
- 正式边界规则已记录到 `docs/repository/shared-foundation-audit.md`

---

### B-03 梳理 `@namelesserlx/editor` 来源策略

**任务目的**

判断编辑器能力在仓库内外的边界，避免后续继续双轨维护。

**当前已发现的问题**

- 编辑器源码已独立发布为 npm 包
- 编辑器能力由 npm 包提供
- 应用侧只保留业务组合、上传逻辑和内容适配

**预期产物**

- 明确以 npm 包 `@namelesserlx/editor` 作为编辑器能力来源
- 写清楚应用侧按 npm 包 README 消费编辑器能力

**当前状态**

- 已完成
- 单一来源策略已记录到 `docs/repository/shared-foundation-audit.md`

---

### B-04 盘点核心依赖版本漂移

**任务目的**

先把版本漂移盘清楚，再决定后续是否统一，而不是现在直接升级。

**重点盘点对象**

- `react`
- `react-dom`
- `typescript`
- `eslint`
- `prettier`
- `prisma`

**预期产物**

- 一份版本差异清单
- 一份统一建议，但当前阶段不直接做大规模升级

**当前状态**

- 已完成
- 正式差异表与收敛建议已记录到 `docs/repository/shared-foundation-audit.md`

---

### B-05 盘点脚本入口一致性

**任务目的**

明确哪些命令是仓库级标准命令，哪些脚本只是局部脚本或历史遗留脚本。

**当前已发现的问题**

- 根脚本较多
- 各应用脚本也较多
- 目前缺少“标准入口命令”的统一说明

**预期产物**

- 一份脚本入口说明
- 一份重复脚本/歧义脚本清单
- 后续再决定是否清理和收敛

**当前状态**

- 已完成
- 标准入口说明已记录到 `docs/repository/workspace-command-entry.md`

---

### B-06 升级 Prisma 到最新版本并迁移到 Prisma 7 新写法

**任务目的**

将仓库中的 Prisma 体系升级到官方最新稳定版，并完成 Prisma 7 需要的新配置、新生成方式和新导入链路迁移。

**当前已发现的问题**

- 当前仓库仍停留在 Prisma 6 系列，根工作区、`packages/db`、`apps/admin/server` 之间存在版本漂移
- 官方最新稳定版本已是 `prisma@7.6.0` 与 `@prisma/client@7.6.0`
- Prisma 7 要求迁移到新的 `prisma-client` 生成器，并显式配置 `output`
- Prisma 7 引入 `prisma.config.ts` 作为 CLI 配置主入口，`package.json#prisma.seed` 已不再是推荐写法
- 仓库中仍有多处直接从 `@prisma/client` 导入 `PrismaClient`、`Prisma` 类型或枚举，后续导入链路需要一起收敛

**预期产物**

- Prisma 相关依赖统一升级到最新稳定版
- `packages/db` 完成 Prisma 7 的 `generator`、`output`、`prisma.config.ts` 迁移
- `@blog/db` 成为 Prisma Client 与 Prisma 类型的统一消费入口
- `build:server` 与 `@blog/db` 构建链路在新版本下稳定可验证

**当前状态**

- 已完成
- 已升级到 `prisma@7.6.0` 与 `@prisma/client@7.6.0`
- `packages/db` 已完成 `prisma-client` 生成器、显式 `output` 和 `prisma.config.ts` 迁移
- 应用源码已收敛为通过 `@blog/db` 或 `@blog/shared` 间接消费 Prisma 生成类型
- 已补充 Prisma 7 升级回归测试，并完成 `@blog/db`、`build:server`、`build:blog` 验证

---

### B-07 推进 `@blog/shared` 导出面治理

**任务目的**

在已完成边界盘点的基础上，把 `@blog/shared` 从“大而全入口”继续收敛成更稳定的共享契约层。

**当前已发现的问题**

- `packages/shared/src/index.ts` 仍是单一大入口导出
- 长期会降低类型发现性，并放大跨端耦合
- 共享层边界虽然已写清，但还没有体现在导出组织策略里

**预期产物**

- 一份更清晰的共享导出策略
- 明确哪些模块适合保留总入口，哪些应改成子路径导出
- 为后续按领域拆分共享契约打基础

**当前状态**

- 进行中
- 已为 `@blog/shared` 增加 `auth`、`blog`、`system`、`dashboard`、`response`、`utils` 子路径入口
- 根入口仍继续保留，当前以兼容式收敛为主，不做激进迁移
- 已修正 `dist/` 旧产物残留导致的导出污染，`build:server` 与 `build:blog` 已重新验证通过

---

### B-08 推进 `@namelesserlx/editor` npm 包落地

**任务目的**

让 `@namelesserlx/editor` 从源码消费迁移为 npm 包消费，并清理仓库内残留。

**当前已发现的问题**

- Blog 和 Admin Client 曾通过 `tsconfig` / bundler alias 映射到编辑器源码
- Docker 与根 CI 曾保留编辑器构建步骤
- 文档中仍残留编辑器作为 monorepo 模块的描述

**预期产物**

- Blog 和 Admin Client 统一消费 npm 包 `@namelesserlx/editor`
- 移除构建脚本、路径 alias 和 Docker 残留
- 文档明确编辑器能力由 npm 包提供

**当前状态**

- 已完成
- Blog 和 Admin Client 已改为消费 npm 包 `@namelesserlx/editor`
- 编辑器源码路径 alias 与构建步骤已清理
- Blog 前台文章渲染通过 `@namelesserlx/editor/readonly` 消费只读渲染能力

---

### B-09 推进 `@blog/config` 实际落地

**任务目的**

让 `@blog/config` 从“存在的共享包”变成“真正生效的规范源”。

**当前已发现的问题**

- 当前只有少量文件真正使用 `@blog/config`
- Lint 和 Prettier 仍以各应用各自维护为主
- `@blog/config` 的存在感与实际价值不匹配

**预期产物**

- 明确 `@blog/config` 应承接的配置范围
- 逐步让各应用共享可复用的工程配置
- 减少重复配置和规范漂移

**当前状态**

- 进行中
- 根目录、Blog、Admin Client 已接入 `@blog/config/prettier-config`
- `@blog/config` 已补齐子路径导出，Prettier 配置可以被工作区真实消费
- `@blog/config` 已补充独立 `check` 脚本，并纳入根级 `ci:baseline`
- ESLint 共享预设虽已补齐导出，但各应用暂未统一切换到同一份共享 ESLint 配置

---

### B-10 补齐共享包测试与构建验证

**任务目的**

给 `shared` / `db` / `editor` / `config` 建立最小验证层，避免共享包成为仓库里最难感知的回归源。

**当前已发现的问题**

- 当前测试主要集中在服务端
- 共享包缺少自己的最小测试或构建验证入口
- 共享包一旦出问题，影响范围往往会跨三端扩散

**预期产物**

- 共享包级最小验证策略
- 至少包含关键构建、导出面和核心行为的验证入口
- 为后续仓库级测试矩阵提供基础节点

**当前状态**

- 进行中
- `packages/db` 已补充独立 `vitest` 回归测试
- 根级 `pnpm test` 已纳入 `packages/db` 的验证
- `shared` / `editor` 已纳入根级构建验证，`config` 已纳入独立 `check` 脚本
- `shared` 与 `editor` 仍缺少同等级单元测试，当前以构建与导出验证为主

## 七、后续任务入口：按职责边界深入分析

这些任务现在**不执行实现**，只保留入口，等 A+B 完成后再展开。

### C-01 Blog 深挖分析

**分析目标**

- Blog 当前的数据路径边界
- 直查数据库、`app/api`、外部服务调用的职责划分
- RSC / Client 边界
- 搜索、PWA、metrics、登录态恢复等现有链路

**当前状态**

- 暂缓

---

### D-01 Admin Client 深挖分析

**分析目标**

- 路由 / 菜单 / 权限的单一来源现状
- `bootstrapAuth`、请求层、store 之间的职责关系
- 复用组件与 CRUD 页面模式
- 编辑器重复实现问题

**当前状态**

- 暂缓

---

### E-01 Admin Server 深挖分析

**分析目标**

- controller / service / lib / config 的职责边界
- Prisma / Redis / MeiliSearch / metrics worker 的组织方式
- 当前测试覆盖盲区

**特别约束**

- 不改 `auth/session/public-routes` 现有设计
- 只记录与之交互的边界，不生成重构任务

**当前状态**

- 暂缓

## 八、当前下一步任务

以下顺序基于当前已完成提交 `1f69df7` 之后的仓库状态。

1. 执行 `A-13`  
   收敛环境变量文件数量，移除自定义共享 env 分层，按官方更常见的 `.env` / `.env.development` / `.env.production` 模式统一加载。
2. 继续收尾 `A-12`  
   根据官方文档推进工程配置文件模块格式现代化，优先处理 `commitlint`、`Prettier` 与 `next.config` 的 `ESM/TS` 收敛，并单独评估 Tailwind 4 的 `CSS-first` 方向。
3. 继续执行 `B-07`  
   治理 `@blog/shared` 的导出面，梳理总入口与子路径导出的边界。
4. 继续执行 `B-09`  
   推进 `@blog/config` 实际落地，让共享工程配置真正被应用消费。
5. 继续完成 `B-10`  
   在 `db` 已有验证基础上，补齐 `shared` / `config` 的最小测试或构建验证。
6. 回到全局复核  
   重新评估 A+B 是否收稳，再决定开启 `C-01`、`D-01`、`E-01`。

## 九、说明

- 这份文件是当前优化周期的主任务文件
- 后续如果新增专项任务，应优先补充到这里或从这里链接出去
- 当前不是“直接改三端”的阶段，而是先把仓库治理和共享基础层收稳
