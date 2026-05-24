# 共享基础层盘点记录

> 这份文档用于承接 `B. 共享基础层` 的正式结论。
>
> 当前阶段的目标不是立即做大规模重构，而是先把共享层边界、版本漂移和脚本入口规范定义清楚，避免后续三端专项优化继续在基础层上反复返工。

## 1. `@blog/db`

### 结论

- `packages/db` 已经是仓库内 Prisma 的统一抽象入口
- 后台服务端中原先绕过统一入口的 `new PrismaClient()` 已完成收敛
- `apps/admin/server` 中本地 `src/lib/prisma.ts` 包装层已移除，服务源码统一直接从 `@blog/db` 引入 prisma
- `packages/db` 已升级到 Prisma `7.6.0`
- `packages/db/prisma/schema.prisma` 已迁移到 `prisma-client` 生成器，并显式指定 `output`
- `packages/db/prisma.config.ts` 已成为 Prisma CLI 的主配置入口
- 仓库中原先直接从 `@prisma/client` 导入的应用源码，已收敛到 `@blog/db` 或 `@blog/shared`
- 后续数据库客户端初始化应继续统一通过 `@blog/db` 暴露的 prisma 实例完成

### 当前动作

- 收敛 Prisma 访问入口，只保留 `@blog/db`
- 补充结构回归测试，避免 `apps/admin/server` 再次直接实例化 `PrismaClient` 或回退到本地 prisma 包装层
- 为 Prisma 7 补充结构回归测试，约束新生成器、`prisma.config.ts`、统一导入和构建脚本

## 2. `@blog/shared`

### 导出面盘点

当前 `@blog/shared` 的导出面已经覆盖以下几个稳定域：

- `types/auth/*`
- `types/blog/*`
- `types/system/*`
- `types/dashboard/*`
- `types/response.ts`
- `utils/*`

### 结论

`@blog/shared` 目前承担了大量跨端共享类型，方向是正确的，但后续需要继续收敛边界：

- 应保留在共享层的内容：
    - 后台接口请求/响应契约
    - 稳定的领域枚举与领域类型
    - 跨端公用的纯函数工具
- 不应继续扩张进共享层的内容：
    - 只对单个页面生效的展示类型
    - 明显依赖某个 UI 或路由结构的本地语义
    - 与某个应用生命周期强绑定的状态结构

### 共享层边界规则

| 类型                     | 是否进入 `@blog/shared` | 说明                                          |
| ------------------------ | ----------------------- | --------------------------------------------- |
| 后台接口 DTO / Response  | 保留                    | 属于跨端稳定契约                              |
| 领域枚举与领域模型       | 保留                    | 如 `role`、`permission`、`article` 等领域对象 |
| 通用工具函数             | 保留                    | 仅限无 UI、无运行环境耦合的纯工具             |
| 页面展示类型             | 不保留                  | 应留在具体应用中                              |
| 路由、菜单、组件状态     | 不保留                  | 属于应用私有语义                              |
| 只服务单个应用的临时类型 | 不保留                  | 不应为“方便复用”而进入共享层                  |

### 当前动作与后续规则

- 现有导出继续保留，不在本轮做激进迁移
- 已新增按领域划分的子路径入口：
    - `@blog/shared/auth`
    - `@blog/shared/blog`
    - `@blog/shared/system`
    - `@blog/shared/dashboard`
    - `@blog/shared/response`
    - `@blog/shared/utils`
- 根入口 `@blog/shared` 继续保留，作为兼容层存在
- `packages/shared` 构建已改为先清理 `dist/` 再编译，避免旧产物污染新的导出面
- 后续新增共享类型前，先回答“是否至少被两个应用稳定使用”
- 如果答案是否定的，就应先放在应用内，等稳定后再评估是否提升到共享层

## 3. `@namelesserlx/editor`

### 当前状态

- 编辑器能力由 npm 包 `@namelesserlx/editor` 提供
- Blog 和 Admin Client 直接消费 npm 包 `@namelesserlx/editor`
- 应用侧显式安装 `@namelesserlx/editor` README 要求的 Tiptap peer runtime
- 仓库内不再配置编辑器源码路径 alias 或独立构建步骤

### 后续规则

- npm 包 README 是编辑器 API 的唯一准入文档
- 业务专属扩展、上传逻辑、主题包装和文章 schema 适配保留在使用方应用内
- 不再新增对编辑器源码路径的依赖
- 更新编辑器能力时，优先升级 npm 版本并验证 `pnpm build:blog` 与 `pnpm build:admin`

## 4. 核心依赖版本漂移

### 重点漂移对象

- `react` / `react-dom`
- `typescript`
- `eslint`
- `prettier`
- `prisma`

### 结论

- 根工作区与应用/共享包之间存在版本漂移
- 当前阶段先完成差异基线和收敛规则，不直接做大规模升级
- 后续统一原则应是：
    - 运行时依赖尽量按应用维度收敛
    - 工程依赖尽量按 workspace 维度收敛
    - 必须分开的版本，需要写明原因

### 当前已确认的版本漂移

| 依赖             | 根工作区 | Blog     | Admin Client | Admin Server | 共享包                    |
| ---------------- | -------- | -------- | ------------ | ------------ | ------------------------- |
| `react`          | `19.1.0` | `19.2.4` | `19.2.4`     | -            | -                         |
| `react-dom`      | `19.1.0` | `19.2.4` | `19.2.4`     | -            | -                         |
| `typescript`     | `5.8.3`  | `6.0.2`  | `5.9.3`      | `5.7.3`      | `shared: 5.8.3`           |
| `eslint`         | `8.57.0` | `9.39.4` | `10.0.2`     | -            | `packages/config: 8.57.0` |
| `prettier`       | `3.5.3`  | `3.8.1`  | -            | -            | `packages/config: 3.5.3`  |
| `prisma`         | `7.6.0`  | -        | -            | -            | `packages/db: 7.6.0`      |
| `@prisma/client` | -        | -        | -            | -            | `packages/db: 7.6.0`      |

### 收敛建议

- `react` / `react-dom`：以应用实际运行版本为准，根工作区不必强行压成更低版本
- `typescript`：优先统一到兼容三端的同一主版本，避免出现 `5.7`、`5.8`、`5.9`、`6.0` 同时存在
- `eslint` / `prettier`：优先按 workspace 级统一
- `prisma` / `@prisma/client`：统一以 `packages/db` 的 Prisma 7 配置为准，应用侧不再直接依赖 `@prisma/client`

## 5. 脚本入口一致性

### 结论

- 根目录已具备大部分标准入口脚本
- 子应用中仍存在较多局部脚本与专项脚本
- 仓库级开发流程应优先使用根目录脚本，局部脚本只作为专项入口

### 标准入口

- 根目录作为标准开发入口：
    - `pnpm dev:blog`
    - `pnpm dev:admin`
    - `pnpm dev:server`
    - `pnpm build:*`
    - `pnpm lint`
    - `pnpm format`
    - `pnpm db:*`

### 入口分层建议

- 根目录保留“标准入口”
    - 开发、构建、Lint、Format、数据库操作
- 应用目录保留“专项入口”
    - `apps/admin/server`：`init-admin:*`、`init-search:*`、`metrics:worker:*`、`clean`
    - `apps/blog`：框架原生命令与局部格式化
    - `apps/admin/client`：局部预览、局部构建、页面内调试能力

### 对开发者的执行规则

- 日常开发优先从根目录启动
- 需要专项调试时，再进入应用目录使用局部脚本
- 文档、任务清单、README 和 AGENTS 中，都以根目录脚本作为主入口

## 6. `@blog/config`

### 结论

- `@blog/config` 已开始从“名义存在”转向“真实生效”
- 当前最适合先统一的是 Prettier 配置，而不是直接硬合并 ESLint
- 根目录、Blog、Admin Client 已接入 `@blog/config/prettier-config`

### 当前动作与后续规则

- 已为 `@blog/config` 补齐 `./prettier-config` 与 `./eslint-preset` 子路径导出
- 已移除共享 Prettier 配置中写死的 `tailwindConfig`，避免非 Tailwind 应用加载失败
- Blog 继续在应用内覆盖自己的 `tailwindConfig`
- ESLint 仍暂缓统一，待 flat config 与旧 `.eslintrc` 的边界先梳理清楚

## 7. 当前状态

- `B-01`：已完成
- `B-02`：已完成，已形成共享层边界规则
- `B-03`：已完成，已形成编辑器单一来源策略
- `B-04`：已完成，已形成版本漂移差异表与收敛建议
- `B-05`：已完成，已形成标准脚本入口规则
- `B-06`：已完成，已升级到 Prisma `7.6.0` 并完成 Prisma 7 配置迁移
- `B-07`：进行中，已建立子路径导出骨架并完成关键构建验证
- `B-08`：已完成，应用侧改为直接消费 `@namelesserlx/editor`
- `B-09`：进行中，Prettier 配置已在多个工作区真实落地
