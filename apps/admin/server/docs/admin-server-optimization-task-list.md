# 后台服务端上线前优化任务清单

> 这是当前 `apps/admin/server` 优化周期的主任务文件，用于持久化保存当前结论、当前任务、执行边界和后续深挖入口。

## 一、这份文件是做什么的

这不是某一个问题的局部修复记录，也不是逐文件 implementation plan。

这份文件的用途是：

- 保存当前阶段已经确认的服务端总体结论
- 记录当前真正可执行的上线前任务
- 约束本轮优化边界，避免继续发散
- 作为后续继续拆分专项文档和执行计划时的单一入口

补充说明：

- 之前产出的 `docs/superpowers/plans/2026-04-06-admin-server-production-readiness.md` 可以作为执行拆解草稿参考
- 当前真正的主入口以这份任务清单为准

## 二、当前阶段说明

当前阶段已经不是“模块职责初看”阶段，而是：

- **后台服务端上线前最终优化阶段**

这意味着：

- `apps/admin/server` 的目录结构、主要模块、关键链路已经完成第一轮盘点
- 当前重点不再是继续扩功能，而是收敛生产风险
- 本轮工作优先处理会影响上线安全性、稳定性、可观测性和维护性的遗留问题
- 命名统一、风格统一、文档补齐仍然要做，但必须服从上线风险优先级

## 三、当前优化约束

- 本轮优化只针对**现有后台服务端系统**，不做新功能扩展
- 当前 `A + B + C` 已完成第一轮收口
- 当前仍缺第二轮结构一致性与错误治理任务
- 所有改动都应尽量限制在 `apps/admin/server` 内部闭环
- 涉及前后端错误契约对齐时，允许跨 `apps/admin/server` 与 `apps/admin/client` 联动收口
- 如果任务涉及 `@blog/shared` 契约变动，必须同时记录对 Admin Client 的兼容影响
- 不做大规模架构重写，不在上线前引入高风险技术迁移
- 目录命名、文件命名、类型收紧等治理项可以推进，但不能抢占 P0 安全和稳定性问题

## 四、当前明确结论

经过当前这一轮审查，可以先固定以下结论：

- **权限边界是当前最危险的问题面**
  很多后台敏感接口只有“登录态”要求，没有明确的权限校验或 owner 校验。

- **认证与会话配置还不够生产化**
  `JWT_SECRET` 存在兜底值，签发和校验入口并不完全统一，存在环境配置漏配后行为不一致的风险。

- **公共入口暴露过宽**
  匿名上传、测试邮件路由、OAuth 半成品入口等问题，说明当前服务端仍保留了较多开发态接口。

- **HTTP 契约和文档契约已经漂移**
  局部控制器在失败时只返回业务错误体，却不设置 HTTP 状态码；Swagger 注解与真实路由也存在脱节。

- **错误处理链路还没有真正收口**
  全局错误中间件、`ControllerErrorHandler`、`ServiceErrorHandler` 和控制器本地 `try/catch` 并存，导致业务异常映射混乱、局部吞错和敏感请求体落日志。

- **前后端错误契约还没有真正对齐**
  服务端正在向真实 `4xx/5xx` 收敛，但 Admin Client 仍混用“`res.code === 0` 成功模型”和 Axios 默认错误分支，导致状态码、响应体 `message` 与页面提示之间没有完全衔接。

- **关键运行时状态仍依赖进程内内存**
  文章预览、邮件队列等能力没有完全落到 Redis / 可共享状态层，与多实例生产部署模型冲突。

- **测试面明显不足**
  当前测试主要集中在 auth 和少量平台约束，缺乏对权限、上传、评论审核、接口状态码、运行时契约的回归保护。

- **代码风格与命名一致性存在明显漂移**
  `articleReport` 目录命名、`*.config.ts` / `*.util.ts` 命名、`any` 泛滥、`console.*` 与自定义 logger 混用，已经影响后续维护。

- **第二轮结构治理仍未完成**
  第一轮把高风险边界收住了，但目录命名、装饰器拆分、错误处理使用规则统一、日志状态与响应状态一致性这些结构性问题还没有真正落地。

- **超大文件和职责过载仍是明显维护风险**
  `dashboard`、`auth/login`、`article`、`comment`、`role`、`permission`、`user`、`decorators` 等文件体量已经过大，后续继续堆功能会明显放大回归成本。

## 五、当前任务总览

| 编号 | 工作流       | 优先级 | 当前状态 | 任务名称                               | 说明                                                           |
| ---- | ------------ | ------ | -------- | -------------------------------------- | -------------------------------------------------------------- |
| A-01 | 安全边界     | P0     | 已完成   | 收敛后台权限矩阵                       | 为敏感接口补齐权限校验和 owner 校验，修复越权风险              |
| A-02 | 安全边界     | P0     | 已完成   | 统一认证与会话安全配置                 | 去掉 `default-secret`，统一 JWT / session / socket 认证入口    |
| A-03 | 安全边界     | P0     | 已完成   | 收敛公共入口与上传能力                 | 关闭匿名上传、测试路由和无约束文件上传入口                     |
| B-01 | 运行时契约   | P0     | 已完成   | 修复 HTTP 错误语义                     | 统一失败请求的 HTTP status 与响应语义                          |
| B-02 | 运行时契约   | P0     | 已完成   | 统一错误处理装饰器与异常链路           | 收敛 decorator / middleware / 本地 catch 的职责边界            |
| B-03 | 运行时契约   | P0     | 已完成   | 修复查询参数解析与路由文档漂移         | 修复布尔解析错误、Swagger 路由漂移与缺失健康检查               |
| B-04 | 运行时稳定性 | P0     | 已完成   | 移除进程内关键状态                     | 收敛预览态、邮件队列等与多实例部署冲突的设计                   |
| C-01 | 核心质量基线 | P0     | 已完成   | 建立后台服务端最小回归矩阵             | 补齐 Vitest 依赖、测试入口和关键链路回归                       |
| C-02 | 可观测性     | P1     | 已完成   | 清理敏感日志与同步文件日志             | 去掉验证码/对象直打日志，减少阻塞式日志写入                    |
| C-03 | 工程治理     | P1     | 已完成   | 收敛配置与环境变量 contract            | 清理硬编码 COS/邮件配置，补齐服务端 env 清单                   |
| C-04 | 一致性治理   | P1     | 已完成   | 收敛目录、文件命名与代码风格           | 统一 `articleReport` 等命名漂移，减少 `any` 和 `console.*`     |
| C-05 | 文档与验收   | P1     | 已完成   | 建立服务端上线验收文档与 smoke list    | 为上线前验证、回滚和运行检查提供明确入口                       |
| D-01 | 结构一致性   | P1     | 已完成   | 统一目录、文件命名与模块边界           | 真正落地 `articleReport` 等命名治理，而不是只做文档记录        |
| D-02 | 结构一致性   | P1     | 已完成   | 拆分 decorators 模块                   | 将超大的 `decorators.ts` 按职责拆成目录模块                    |
| D-03 | 错误治理     | P0     | 已完成   | 统一装饰器使用策略与覆盖范围           | 明确哪些 controller/service 必须使用错误装饰器                 |
| D-04 | 错误治理     | P0     | 进行中   | 校正错误日志、访问日志与响应状态一致   | 修复日志里假 `500`、提升异常来源定位能力                       |
| D-05 | 模块治理     | P1     | 进行中   | 拆分超大 service/controller 文件       | 收敛职责过载文件，降低继续迭代时的回归风险                     |
| D-06 | 模块治理     | P1     | 已完成   | 清理半成品与不统一模块                 | 收口 Google OAuth TODO、base controller/导出边界等遗留问题     |
| E-01 | 契约对齐     | P0     | 已完成   | 固化前后端统一错误契约                 | 明确 HTTP status、body.code、message 与前端控制流的最终规则    |
| E-02 | 契约对齐     | P0     | 已完成   | 服务端统一业务异常与状态码映射         | 收敛裸 `Error`、统一业务异常出口与响应体格式                   |
| E-03 | 契约对齐     | P0     | 已完成   | 修正服务端 `401/404/body.code` 特例    | 修复未命中路由、鉴权中间件和权限中间件的契约漂移               |
| E-04 | 契约对齐     | P0     | 已完成   | 前端请求层统一消费错误响应             | 让 `request.ts` 正确读取后端状态码和 `message`                 |
| E-05 | 契约对齐     | P1     | 已完成   | 页面与 store 清理旧失败模型依赖        | 清理“失败也靠 `res.code` 分支处理”的历史写法                   |
| E-06 | 契约对齐     | P0     | 已完成   | 建立前后端错误联调与回归清单           | 验证登录失效、校验失败、权限不足、资源不存在等提示正确         |
| F-01 | 错误治理专项 | P0     | 已完成   | 建立“单次异常单点记录”规则             | 任何请求链路中的同一异常只能有一条主错误日志                   |
| F-02 | 错误治理专项 | P0     | 已完成   | 重构装饰器为“补充上下文而非重复打日志” | 保留定位能力，但去掉 service/controller 双重或三重日志         |
| F-03 | 错误治理专项 | P0     | 已完成   | 收敛认证、权限与缓存异常出口           | 区分未登录、无权限、缓存/DB/Redis 故障，禁止系统异常伪装成 403 |
| F-04 | 错误治理专项 | P1     | 已完成   | 清理剩余裸 `Error` 与基础设施异常映射  | 补齐搜索、邮件、AI、配置类异常的语义化映射                     |
| F-05 | 错误治理专项 | P0     | 已完成   | 优化错误日志性能与负载                 | 减少热路径对象序列化、无效堆栈采集和同步开销                   |
| F-06 | 错误治理专项 | P0     | 已完成   | 建立错误治理专项回归与基线             | 用自动化和 smoke 锁住“只记录一次、状态正确、性能不倒退”        |

## 六、当前明确可执行的任务：A. 安全边界

### A-01 收敛后台权限矩阵

**任务目的**

把当前“只要登录就能调用”的后台敏感接口收敛成明确的权限模型，避免上线后出现低权限账号越权修改系统数据。

**当前已发现的问题**

- `system/permission` 大部分接口没有显式权限保护
- `system/role` 只有删除角色用到了 `checkPermission`
- `blog/article`、`blog/snippet`、`blog/photo`、`dashboard` 等管理接口基本没有权限装饰器
- 评论接口把“普通用户编辑评论”和“后台审核评论”混在一个更新入口里

**涉及范围**

- `src/controllers/system/permission/index.ts`
- `src/controllers/system/role/index.ts`
- `src/controllers/blog/article/index.ts`
- `src/controllers/blog/snippet/index.ts`
- `src/controllers/blog/photo/index.ts`
- `src/controllers/dashboard/index.ts`
- `src/controllers/blog/comment/index.ts`
- 必要时同步 `src/routes/**`

**预期产物**

- 一份明确的后台接口权限矩阵
- 关键写接口全部加上 `@RequirePermission(...)` 或等价权限中间件
- 评论更新拆成“本人编辑”和“后台审核”两个语义清晰的入口

**验证要求**

- 低权限账号不能访问系统管理写接口
- 无评论审核权限的普通用户不能修改评论状态
- 权限相关回归测试补齐

**当前状态**

- 已完成

**本轮执行备注**

- `permission`、`role`、`content`、`dashboard` 相关 controller 已补齐首轮权限装饰器
- 评论更新链路已收口为“普通编辑内容 + 审核改状态”两条逻辑，并新增 `/blog/comments/moderate`
- `system/user`、`blog/tag` 的明显敏感入口也补了一轮权限收口

---

### A-02 统一认证与会话安全配置

**任务目的**

把当前 JWT / session / socket 鉴权相关配置收敛成单一安全入口，消除配置漏配和行为不一致问题。

**当前已发现的问题**

- `JWT_SECRET` 存在 `default-secret` 兜底
- token 签发与 token 校验并没有完全统一到同一个配置入口
- HTTP 鉴权和 WebSocket 鉴权虽然共用 session 语义，但配置层并不统一

**涉及范围**

- `src/services/auth/session-manager.ts`
- `src/utils/auth.ts`
- `src/middlewares/auth.ts`
- `src/services/auth/session.ts`
- `src/config/**`

**预期产物**

- 新的安全配置入口，例如 `security.ts`
- 所有 JWT 相关读写都只通过一个配置源读取
- 缺少关键环境变量时，服务应在启动期明确失败，而不是隐式回退

**验证要求**

- 代码中不再出现 `default-secret`
- 鉴权相关测试通过
- 启动期配置错误能够被明确感知

**当前状态**

- 已完成

**本轮执行备注**

- 新增 `src/config/security.ts`
- `session-manager`、`utils/auth`、`middlewares/auth` 已统一改为通过 `getJwtSecret()` 读取 JWT secret
- `default-secret` 已从后台服务端关键认证链路中移除
- `app.ts` 已增加启动期安全配置校验

---

### A-03 收敛公共入口与上传能力

**任务目的**

收紧当前不应该继续暴露在生产环境中的匿名接口和测试接口，避免服务端继续带着开发态入口上线。

**当前已发现的问题**

- `/api/global/upload` 被加入了 public routes
- 上传入口直接使用裸 `multer()`，没有大小限制、类型限制和统一过滤
- `/email/test-*` 路由仍在正式路由注册链路里
- 上传链路过于相信客户端传入的 `mimetype` 和文件名

**涉及范围**

- `src/config/public-routes.ts`
- `src/routes/global/index.ts`
- `src/routes/blog/photo/index.ts`
- `src/routes/blog/snippet/index.ts`
- `src/routes/system/user/index.ts`
- `src/routes/email/test.ts`
- `src/services/global/index.ts`
- `src/utils/cos.ts`

**预期产物**

- 公共路由清单收紧
- 测试邮件路由在生产环境不再注册
- 统一的上传限制和文件过滤配置
- 必要时将全局上传改为登录态或特定权限接口

**验证要求**

- 匿名用户不能再调用后台上传入口
- 超大文件和非法类型文件被明确拒绝
- 非生产环境仍可保留必要的测试能力

**当前状态**

- 已完成

**本轮执行备注**

- `/api/global/upload` 已从 public routes 移除
- 生产环境下不再注册 `/email/test-*` 路由
- 上传入口已统一接入 `src/config/upload.ts`
- `global` / `photo` / `snippet` / `user avatar` 上传已补文件类型与大小限制

## 七、当前明确可执行的任务：B. 运行时契约、错误处理与稳定性

### B-01 修复 HTTP 错误语义

**任务目的**

确保所有失败请求既返回正确的业务错误结构，也返回正确的 HTTP status，避免监控、网关和前端全部拿到伪 `200 OK`。

**当前已发现的问题**

- 多个 controller 在 `catch` 后只 `ctx.body = Response.error(...)`
- 部分认证失败返回 `401`，但同类错误在其他入口又仍然返回 `200`
- 当前错误语义不稳定，会导致前端和可观测性系统误判

**涉及范围**

- `src/controllers/auth/login.ts`
- `src/controllers/auth/oauth/base.ts`
- `src/controllers/auth/oauth/google.ts`
- `src/controllers/auth/oauth/github.ts`
- `src/controllers/email/test.ts`
- `src/controllers/global/index.ts`
- `src/controllers/blog/photo/index.ts`
- 其他存在本地 `try/catch` 的 controller

**预期产物**

- 统一的错误返回约定
- 常见失败场景明确映射到 `400/401/403/404/500`
- 局部 controller 不再随意吞错或返回伪成功状态

**验证要求**

- 失败请求不再落成 `200`
- auth/status contract 测试补齐

**当前状态**

- 第一轮已完成

**本轮已落地**

- `src/controllers/auth/login.ts` 已移除本地吞错式 `try/catch`，登录、刷新、检查登录、验证码、重置密码等入口改为走统一异常管道
- `src/controllers/email/test.ts` 与 `src/controllers/blog/comment/index.ts` 的局部参数校验改为抛明确验证异常，不再返回伪 `200`
- 新增 `tests/controllers/auth-error-semantics.test.ts`，补齐登录校验失败与未登录状态的 HTTP status contract

---

### B-02 统一错误处理装饰器与异常链路

**任务目的**

把当前 service / controller / middleware / 权限装饰器之间割裂的异常处理行为收敛成单一约定，避免业务错误被误判成 `500`、控制器局部吞错，以及敏感请求体被直接写入日志。

**当前已发现的问题**

- `ServiceErrorHandler` 会把大量普通 `Error` 包成 `UNKNOWN_ERROR`
- service 层大量 `throw new Error(...)` 实际承载了 `400 / 401 / 404` 等业务分支
- `ControllerErrorHandler`、全局 `errorHandler`、控制器本地 `try/catch` 并存，职责边界混乱
- `RequirePermission` 直接写 `ctx.status / ctx.body` 并吞异常，没有走统一错误出口
- `ControllerErrorHandler` 直接记录 `ctx.request.body`，存在密码、验证码、重置令牌等敏感字段泄漏风险

**涉及范围**

- `src/utils/decorators.ts`
- `src/middlewares/error-handler.ts`
- `src/types/errors.ts`
- `src/controllers/auth/login.ts`
- `src/controllers/auth/oauth/base.ts`
- `src/controllers/email/test.ts`
- `src/controllers/global/index.ts`
- `src/services/auth/login.ts`
- 其他依赖 `@ControllerErrorHandler`、`@ServiceErrorHandler` 或本地 `try/catch` 的 controller / service

**预期产物**

- 一份明确的服务端异常处理约定
- `ServiceErrorHandler` 收敛为“记录 + 透传”或最小类型转换，不再粗暴把普通 `Error` 统一打成 `500`
- 高频业务校验改为明确的 `BusinessError` / `AuthError` / `ValidationError`
- 权限装饰器接入统一错误出口，而不是自己拼响应和吞错
- controller 层敏感 body 日志完成脱敏或移除

**验证要求**

- 登录、验证码、未登录、权限失败等常见业务错误不再全部落成 `500`
- 本地 `try/catch` 数量明显收敛，失败请求能被统一错误管道接管
- 日志中不再直接出现密码、验证码、重置令牌等请求体字段

**当前状态**

- 第一轮已完成

**本轮已落地**

- `src/utils/decorators.ts` 中的 `ServiceErrorHandler` 已收敛为“记录 + 透传”，不再把普通 `Error` 粗暴包装成 `UNKNOWN_ERROR`
- `ControllerErrorHandler` 已对请求体做敏感字段脱敏，密码、验证码、令牌等字段不再直接写入错误日志
- `RequirePermission` 已改为抛统一业务异常并交给全局错误中间件接管，不再自己拼响应和吞异常
- `src/services/auth/login.ts` 已把登录、邮箱验证码、密码重置、注册等高频业务校验改成明确的 `ValidationError` / `AuthError` / `UserError`
- 新增 `tests/platform/error-handling.test.ts`，覆盖敏感日志脱敏与 service error 透传行为

---

### B-03 修复查询参数解析与路由文档漂移

**任务目的**

收敛当前接口层“运行时行为”和“文档宣称行为”的差异，减少难以追踪的线上歧义。

**当前已发现的问题**

- `Boolean('false') === true` 导致文章/片段列表布尔筛选错误
- controller decorator 的 `@prefix(...)` 与真实 route prefix 并不总是一致
- Swagger 当前关闭实际校验，只保留注解展示能力
- `public-routes.ts` 里声明了 `/health`，但服务内没有对应实现

**涉及范围**

- `src/controllers/blog/article/index.ts`
- `src/controllers/blog/snippet/index.ts`
- `src/controllers/system/**`
- `src/config/swagger.ts`
- `src/routes/**`

**预期产物**

- 统一的 query parsing helper
- Swagger 路由和真实路由对齐
- 补齐真实健康检查入口
- 明确哪些接口文档只做展示，哪些接口已有真实运行时校验

**验证要求**

- `published=false`、`isDraft=false` 等筛选语义正确
- Swagger 中的核心管理接口路径与实际访问路径一致
- `/health` 可用

**当前状态**

- 已完成

**本轮已落地**

- 新增 `src/utils/query.ts`，文章与片段列表已经不再使用 `Boolean('false')`
- `src/controllers/blog/article/index.ts`、`src/controllers/blog/snippet/index.ts` 已修正布尔筛选解析
- `src/config/swagger.ts` 已统一 `prefix: '/api'`，并清理调试日志
- 文章、片段、相册、标签、评论、用户、角色、权限等 controller 的 swagger prefix 已和真实 route 结构对齐，GitHub / Google OAuth 文档路径也去掉了重复段
- 新增真实健康检查入口 `src/routes/health.ts`，并在 `src/app.ts` 中挂载 `/health`
- 新增 `tests/controllers/query-parsing.test.ts` 与 `tests/platform/health-route.test.ts`

---

### B-04 移除进程内关键状态

**任务目的**

让当前服务端状态模型与多实例部署模型一致，避免上线后出现“偶发失效、重启即丢”的问题。

**当前已发现的问题**

- 文章预览 token 保存在进程内 `Map`
- 邮件队列保存在进程内数组
- PM2 生产配置使用了多实例 cluster
- 当前设计在重启、切流、实例漂移时都不稳定

**涉及范围**

- `src/services/blog/article/preview.ts`
- `src/utils/email/index.ts`
- `ecosystem.config.js`
- 相关 Redis 能力

**预期产物**

- 预览态迁移到 Redis 或等价共享状态层
- 邮件发送从“进程内队列”改成更可控的生产方案
- 明确 dev 和 prod 两套行为边界

**验证要求**

- 多实例下预览态不再随机失效
- 重启后关键任务不因进程内内存而直接丢失

**当前状态**

- 已完成

**本轮已落地**

- `src/services/blog/article/preview.ts` 已从进程内 `Map` 切换为 Redis 存储，文章预览 token 不再绑定单实例内存
- `src/services/blog/article/index.ts` 已接入异步 Redis 预览态读取
- `src/utils/email/index.ts` 已移除进程内队列与处理循环，改为直接发送 + 有限重试
- `src/services/email/notification.ts` 已将验证码/重置邮件切为“必须送达”的直接发送，将评论/欢迎邮件切为无队列的 best-effort 异步投递
- 邮件服务状态保留兼容结构，但队列长度固定为 `0`，不再依赖进程内积压状态
- 新增 `tests/platform/preview.test.ts` 与 `tests/platform/email-delivery.test.ts`

## 八、当前明确可执行的任务：C. 质量基线与可维护性

### C-01 建立后台服务端最小回归矩阵

**任务目的**

给 `apps/admin/server` 建立真正可执行的最小测试基线，让后续上线前修复不再完全依赖手工验证。

**当前已发现的问题**

- 当前只有 5 个测试文件
- 测试主要集中在 auth 和少量平台约束
- 权限、上传、评论审核、HTTP status、应用启动都缺少保护
- `package.json` 有 `test` 脚本和 `vitest.config.ts`，但当前包内没有显式 `vitest` 依赖

**涉及范围**

- `package.json`
- `vitest.config.ts`
- `tests/auth/**`
- `tests/platform/**`

**预期产物**

- 补齐测试依赖
- 增加最小回归矩阵，优先覆盖：
    - app bootstrap
    - security config
    - permission coverage
    - upload guard
    - HTTP status contract

**验证要求**

- `pnpm --filter @blog/server test` 可执行
- 新增测试覆盖当前 P0 问题面

**当前状态**

- 已完成

**本轮执行备注**

- `@blog/server` 已补显式 `vitest` 依赖，测试入口仍保持 `pnpm --filter @blog/server test`
- 当前最小回归矩阵已固定到 `tests/auth/**`、`tests/controllers/**`、`tests/platform/**`
- 新增 [server-test-matrix.md](./server-test-matrix.md) 作为后续扩测入口

---

### C-02 清理敏感日志与同步文件日志

**任务目的**

减少会泄露敏感信息、污染日志、阻塞请求线程的日志行为。

**当前已发现的问题**

- 验证码被直接打印到日志
- 评论对象、父评论对象被整包输出
- `console.*` 与自定义 logger 大量混用
- 自定义 logger 使用 `appendFileSync`，存在阻塞风险

**涉及范围**

- `src/services/email/notification.ts`
- `src/services/blog/comment/index.ts`
- `src/middlewares/auth.ts`
- `src/utils/logger.ts`
- 全局 `console.*` 调用点

**预期产物**

- 敏感字段不再落日志
- 日志输出路径更统一
- 移除明显阻塞式或调试态日志

**验证要求**

- 日志中不再出现验证码、重置令牌、整包实体对象
- 请求链路中的 `console.log` 明显减少

**当前状态**

- 已完成

**本轮执行备注**

- `logger` 已从同步 `appendFileSync` 切到异步 `fs.promises.appendFile`
- 请求链路和基础设施链路中的 `console.*` 已统一收敛到 logger
- OAuth、Redis、MeiliSearch、搜索同步、邮件、端口管理等运行时热点已去掉直接 `console.*`

---

### C-03 收敛配置与环境变量 contract

**任务目的**

把当前散落、硬编码、语义不清的基础设施配置收敛成清晰的服务端 contract。

**当前已发现的问题**

- COS bucket、region、domain 存在硬编码
- 邮件配置 `secure: true` 与 `587` 端口组合可疑
- 缺少服务端自己的 env 清单和最低启动约束

**涉及范围**

- `src/config/cos.ts`
- `src/config/email.ts`
- `src/bootstrap/load-env.ts`
- 服务端文档目录

**预期产物**

- 服务端 env contract 清单
- 去掉明显硬编码
- 启动期关键配置校验更明确

**验证要求**

- dev / prod 配置边界清楚
- 关键基础设施配置不再依赖源码硬编码

**当前状态**

- 已完成

**本轮执行备注**

- 新增 [env.ts](../src/config/env.ts) 统一服务端 env 校验
- 邮件 `secure` 已改为由 `SMTP_SECURE` 或端口推导
- COS 关键配置已移除源码硬编码，并新增启动/调用前校验
- 新增 `.env.example` 和 env contract 文档，明确 server / db 两侧边界

---

### C-04 收敛目录、文件命名与代码风格

**任务目的**

在不阻断上线的前提下，逐步收敛已经明显漂移的命名和风格问题，降低后续维护摩擦。

**当前已发现的问题**

- `articleReport` 使用 camelCase 目录命名
- `*.config.ts`、`*.util.ts`、`global/index.ts`、`index.ts` 等命名混杂
- `strict: false`、`strictNullChecks: false`、`noImplicitAny: false`
- 大量 `any`、`ctx.query as unknown as ...`、局部 `console.*`

**涉及范围**

- `src/controllers/blog/article-report/**`
- `src/routes/blog/article-report/**`
- `src/services/blog/article-report/**`
- `tsconfig.json`
- 全局 `src/**`

**预期产物**

- 一份命名和风格治理边界说明
- 上线后可继续推进的重命名与类型收紧清单
- 大文件拆分入口和 `any` 清理入口

**验证要求**

- 不在上线前做高风险大迁移
- 治理项有明确后续入口，不再散落

**当前状态**

- 已完成

**本轮执行备注**

- 这轮没有做高风险目录重命名，而是把治理边界显式文档化
- 运行时 `console.*` 已基本清理，只保留 logger 自身的控制台出口
- `articleReport -> article-report` 已在 controller / route / service 三侧落地，剩余命名边界继续按批次推进

---

### C-05 建立服务端上线验收文档与 smoke list

**任务目的**

把上线前需要人工确认的关键项固化成文档，降低“代码修了但上线检查漏掉”的风险。

**当前已发现的问题**

- `apps/admin/server/docs/` 目前只有通用 README
- 没有服务端自己的上线 smoke list
- 没有针对 auth、permission、upload、search、mail、dashboard 的最小验收清单

**涉及范围**

- `apps/admin/server/docs/**`

**预期产物**

- 服务端上线前验收清单
- 服务端模块入口文档
- 最小 smoke 路径，例如：
    - 登录
    - 权限拒绝
    - 文章创建 / 更新
    - 评论审核
    - 搜索重建
    - 邮件发送
    - 健康检查

**当前状态**

- 已完成

**本轮执行备注**

- 新增 [server-release-smoke-list.md](./server-release-smoke-list.md)
- 服务端文档入口 [README.md](./README.md) 已补齐测试矩阵、env 契约、治理边界和 smoke list 导航

## 九、当前明确可执行的任务：D. 第二轮结构一致性与错误治理

### D-01 统一目录、文件命名与模块边界

**任务目的**

把第一轮“只做文档记录”的命名治理，推进到真正落地的目录与模块边界统一，减少继续开发时的认知摩擦。

**当前已发现的问题**

- `articleReport` 目录历史上使用 camelCase，与仓库文档约定不一致
- `*.config.ts`、`*.util.ts`、`*.service.ts` 与 `kebab-case` 文件命名长期混杂
- 目录、文件名和“是否是模块入口/是否是基础设施配置”之间缺少统一规则

**涉及范围**

- `src/controllers/blog/article-report/**`
- `src/routes/blog/article-report/**`
- `src/services/blog/article-report/**`
- `src/config/**`
- `src/utils/**`

**预期产物**

- `articleReport -> article-report` 等命名治理真正落地
- server 内部文件命名边界说明收敛为可执行规则
- 模块入口、配置文件、普通工具文件的命名语义更清晰

**验证要求**

- 重命名后路由、controller、service、import 全部一致
- 不再继续新增新的命名漂移

**当前状态**

- 进行中

**本轮执行备注**

- 已移除 `src/routes/auth/oauth/github.ts`、`src/routes/auth/oauth/google.ts` 中未被当前前端流程使用的 `authorize/callback/status` 入口
- 已删除 `src/controllers/auth/oauth/base.ts`，不再保留只服务于半成品 OAuth 跳转流程的抽象基类
- GitHub / Google OAuth controller 目前仅保留实际在用的 `login`、`bind`、`unbind` 入口
- 新增 `tests/platform/oauth-routes.test.ts`，锁定当前 OAuth 路由暴露面，避免半成品入口再次回流

---

### D-02 拆分 decorators 模块

**任务目的**

将当前职责过多的 `decorators.ts` 拆成按职责组织的模块，降低后续错误治理和权限治理继续堆叠的复杂度。

**当前已发现的问题**

- [decorators.ts](../src/utils/decorators.ts) 当前已经达到 `481` 行
- 文件内部同时承担错误处理、权限校验、参数校验、性能监控、重试、日志脱敏等职责
- 后续任何一个装饰器的调整都会放大这个文件的回归面

**涉及范围**

- `src/utils/decorators.ts`
- 所有引用 decorators 的 controller / service / script

**预期产物**

- `src/utils/decorators/` 目录
- 错误处理、权限、校验、性能、通用 helper 按职责拆分
- 一个统一的 `index.ts` 导出入口

**验证要求**

- import 路径迁移后构建通过
- decorator 行为不发生语义回归

**当前状态**

- 已完成

**本轮执行备注**

- `src/utils/decorators.ts` 已拆分为 `src/utils/decorators/` 目录
- 已按职责收口为：
    - `error.ts`
    - `permission.ts`
    - `validation.ts`
    - `runtime.ts`
    - `sanitize.ts`
    - `index.ts`
- 外部导入面继续保持 `utils/decorators` 不变，controller / service / script 不需要大面积迁移路径
- 已完成最小构建验证：`pnpm build:server`

---

### D-03 统一装饰器使用策略与覆盖范围

**任务目的**

让 `ServiceErrorHandler`、`ControllerErrorHandler` 从“局部采用”变成“有明确规则的项目约束”，避免同类模块处理风格继续分叉。

**当前已发现的问题**

- 当前 `controller` 一共 `17` 个 ts 文件，使用 `ControllerErrorHandler` 的只有 `15` 个
- 当前 `service` 一共 `24` 个 ts 文件，使用 `ServiceErrorHandler` 的只有 `15` 个
- 真正的业务 service 里仍有大量入口完全不在统一装饰器覆盖范围内
- `auth/oauth/base.ts`、`auth/oauth/google.ts` 等 controller 的错误处理风格仍不统一

**涉及范围**

- `src/controllers/**`
- `src/services/**`
- `src/utils/decorators/**`

**预期产物**

- 一份清晰的“哪些文件必须使用错误装饰器、哪些文件明确例外”的规则
- controller 层统一收口为有限几种错误出口
- service 公共入口方法的错误记录方式更一致

**验证要求**

- 同类 controller/service 不再一半装饰器、一半裸实现
- 规则可被后续新增文件直接继承

**当前状态**

- 已完成

**本轮执行备注**

- GitHub / Google OAuth controller 的真实路由方法已全部补齐 `@ControllerErrorHandler`
- `ArticleService`、`CommentService`、`PermissionService`、`RoleService`、`ArticleSearchService`、`GlobalService` 的公共异步入口已补齐 `@ServiceErrorHandler`
- `AuthService`、`PhotoService`、`SnippetService`、`EmailNotificationService` 的公开异步入口也已全部补齐 `@ServiceErrorHandler`
- `globalService` 已从对象字面量收口成 `GlobalService` 实例，避免关键业务入口继续成为装饰器体系外的例外
- `tests/platform/decorator-coverage.test.ts` 已扩展到 `AuthService`、`PhotoService`、`SnippetService`、`EmailNotificationService`
- 当前扫描结果已不再出现 `@request(...)` 与 `@ControllerErrorHandler` 数量不一致，或“公开 async service 方法数与 `@ServiceErrorHandler` 数量不一致”的文件
- 已完成最小验证：
    - `pnpm --filter @blog/server test tests/platform/decorator-coverage.test.ts`
    - `pnpm build:server`

---

### D-04 校正错误日志、访问日志与响应状态一致

**任务目的**

修复当前“客户端拿到的是 `403/400`，但服务端访问日志里仍打印 `500`”的观测不一致问题，提升线上排障可信度。

**当前已发现的问题**

- 真实 smoke 中已观察到：
    - 评论审核越权实际响应 `403`，但访问日志打印 `500`
    - 非法上传实际响应 `400`，但访问日志打印 `500`
- `ControllerErrorHandler`、`ServiceErrorHandler`、全局 `errorHandler` 与 `koa-logger` 的协作边界还不够稳定
- 当前虽能返回业务错误，但不代表日志和状态可被可信观测

**涉及范围**

- `src/app.ts`
- `src/middlewares/error-handler.ts`
- `src/utils/decorators.ts`
- 受影响的 controller / upload middleware

**预期产物**

- 响应状态与访问日志状态一致
- 业务异常不会再在访问日志里表现成假 `500`
- 错误来源定位信息更明确，便于区分 controller、service、middleware 抛错

**验证要求**

- 真实 smoke 里 `401/403/400` 与访问日志一致
- 线上排障时能更准确知道错误来自哪一层

**当前状态**

- 已完成

**本轮执行备注**

- `src/controllers/blog/article-report`、`src/routes/blog/article-report`、`src/services/blog/article-report` 已完成目录命名统一
- `src/config/**` 下的运行时配置文件已统一为 `*-config.ts`
- `src/utils/cos.ts`、`src/utils/port.ts` 与 `src/services/email/notification.ts` 已统一为 `kebab-case`
- 相关 import、测试和活跃文档引用已完成同步
- 当前扫描 `apps/admin/server/src` 已不再出现大写、`.config.`、`.util.`、`.service.` 这类明显命名漂移

---

### D-05 拆分超大 service/controller 文件

**任务目的**

把目前已经明显职责过载的大文件拆成更稳定的模块边界，降低继续优化和回归验证的难度。

**当前已发现的问题**

- `src/services/dashboard/index.ts` `1038` 行
- `src/services/auth/login.ts` `730` 行
- `src/services/blog/article/index.ts` `675` 行
- `src/services/blog/comment/index.ts` `617` 行
- `src/services/system/role/index.ts` `570` 行
- `src/services/system/permission/index.ts` `488` 行
- `src/services/system/user/index.ts` `486` 行
- `src/utils/decorators.ts` `481` 行

**涉及范围**

- `src/services/dashboard/index.ts`
- `src/services/auth/login.ts`
- `src/services/blog/article/index.ts`
- `src/services/blog/comment/index.ts`
- `src/services/system/role/index.ts`
- `src/services/system/permission/index.ts`
- `src/services/system/user/index.ts`

**预期产物**

- 至少一批职责明显可分离的大文件完成拆分
- repository / helper / policy / notifier 等边界更清晰
- 后续修改时不再总是落到单个超大文件里

**验证要求**

- 拆分后行为不变
- 定向测试和构建可证明回归受控

**当前状态**

- 进行中

**本轮执行备注**

- `src/services/dashboard/index.ts` 已收口为控制台总览入口编排层
- 仪表盘窗口解析、内容统计、流量统计、待办任务、漏斗统计、展示构建与内部类型已拆分到独立文件：
    - `src/services/dashboard/window.ts`
    - `src/services/dashboard/content.ts`
    - `src/services/dashboard/traffic.ts`
    - `src/services/dashboard/tasks.ts`
    - `src/services/dashboard/funnel.ts`
    - `src/services/dashboard/presentation.ts`
    - `src/services/dashboard/types.ts`
- `dashboardService.getOverview()` 的对外调用方式保持不变，controller 与 websocket 侧无需跟着改接口
- `src/services/auth/login.ts` 已拆出用户资料与登录响应构建能力到 `src/services/auth/profile.ts`
- `src/services/auth/login.ts` 已拆出邮箱验证码、重置令牌与通知投递能力到 `src/services/auth/mail.ts`
- OAuth 登录链路已同步改用新的 `profile.ts` 能力，避免继续依赖 `AuthService` 内部私有组织
- 已完成最小构建验证：`pnpm build:server`

---

### D-06 清理半成品与不统一模块

**任务目的**

把第一轮里暂时保留的半成品和风格不统一模块真正收口，避免上线后继续带着“看起来像完成，实际上未完成”的链路。

**当前已发现的问题**

- [google.ts](../src/controllers/auth/oauth/google.ts) 里 `callback/status` 仍有 TODO 语义
- OAuth controller / service 的行为风格仍不统一
- `auth/index.ts`、`oauth/index.ts`、部分 base controller 目前更多是历史导出层，而不是清晰的模块边界

**涉及范围**

- `src/controllers/auth/oauth/**`
- `src/services/auth/oauth/**`
- `src/controllers/auth/index.ts`
- `src/services/auth/index.ts`

**预期产物**

- 半成品模块要么真正补完，要么显式降级/下线
- auth/oauth 模块导出边界更清晰
- 不再保留误导性的 TODO 入口

**验证要求**

- OAuth 相关代码的完成度和暴露入口一致
- 不再保留“已暴露但未真正完成”的管理后台能力

**当前状态**

- 已完成

**本轮执行备注**

- 已移除 server 侧未使用的 OAuth `authorize`、`callback`、`status` 暴露入口，仅保留当前实际使用的 `login / bind / unbind`
- 已删除历史遗留的 `src/controllers/auth/oauth/base.ts`
- OAuth 登录链路已同步改用 `src/services/auth/profile.ts` 提供的用户角色与权限组装能力
- 已移除纯中转的 `src/controllers/auth/oauth/index.ts`、`src/routes/auth/oauth/index.ts`、`src/services/auth/oauth/index.ts`
- `src/controllers/auth/index.ts`、`src/routes/auth/index.ts`、`src/services/auth/index.ts` 继续保留为顶层聚合入口，但已改为直接导出 `github.ts`、`google.ts`，不再经由嵌套 index 二次转手
- `src/controllers/auth/oauth/github.ts` 与 `src/controllers/auth/oauth/google.ts` 已移除本地 `try/catch + 手写 status`，统一回到错误装饰器出口
- `src/services/auth/oauth/github.ts` 与 `src/services/auth/oauth/google.ts` 的公开 `bind / unbind / login` 入口已统一纳入 `@ServiceErrorHandler`
- 已完成最小验证：
    - `pnpm --filter @blog/server test tests/platform/oauth-routes.test.ts`
    - `pnpm build:server`

## 十、当前明确可执行的任务：E. 前后端错误契约对齐

### E-01 固化前后端统一错误契约

**任务目的**

把当前“服务端语义在变、前端消费方式还停留在旧模型”的错误返回规则正式定稿，避免继续边改边漂。

**当前已发现的问题**

- 服务端成功响应固定是 `{ code: 0, data, message }`
- 服务端失败响应目前混用了 `code = 1` 和 `code = HTTP status`
- Admin Client 的 `request.ts` 同时依赖 `res.code === 0`、`res.code === 401` 和 `error.response.status === 401`
- 页面层有不少逻辑仍假设“失败响应会进入 `res.code !== 0` 分支”，与真实 `4xx/5xx` 流程不完全匹配

**涉及范围**

- `apps/admin/server/src/utils/response.ts`
- `apps/admin/server/src/types/errors.ts`
- `apps/admin/server/src/middlewares/error-handler.ts`
- `apps/admin/client/src/utils/request.ts`
- 必要时同步 `packages/shared/src/types/response.ts`

**预期产物**

- 一份明确的最终错误契约：
    - 成功：`HTTP 2xx + { code: 0, data, message }`
    - 失败：`HTTP 4xx/5xx + { code: HTTP status, data: null, message }`
    - 前端控制流优先看 `HTTP status`
    - 前端提示文案优先看 `response body.message`
- `401`、`403`、`404`、`400` 的使用边界写清楚
- 前后端不再同时维护两套互相冲突的失败模型

**验证要求**

- 任何一条失败链路都能明确回答“HTTP status 是什么、body.code 是什么、页面最终提示什么”
- 契约能被 `request.ts` 和服务端全局错误处理中间件共同执行

**当前状态**

- 已完成
- 当前正式契约固定为：
    - 成功：`HTTP 2xx + { code: 0, data, message }`
    - 失败：`HTTP 4xx/5xx + { code: HTTP status, data: null, message }`
    - 前端控制流优先看 `HTTP status`
    - 前端提示文案优先看 `response body.message`

---

### E-02 服务端统一业务异常与状态码映射

**任务目的**

把服务端里仍然游离在错误契约之外的原始 `Error` 全部收敛回 `BusinessError` 体系，让真正的业务失败不再被误判成 `500`。

**当前已发现的问题**

- `src/services/**` 中仍存在大量 `throw new Error(...)`
- 这些错误经过 `ServiceErrorHandler` 和全局中间件后，大概率会落成 `500`
- 文章、评论、全局上传、OAuth 绑定等业务入口仍没有完全进入统一错误语义

**涉及范围**

- `apps/admin/server/src/services/blog/article/index.ts`
- `apps/admin/server/src/services/blog/comment/index.ts`
- `apps/admin/server/src/services/blog/snippet/index.ts`
- `apps/admin/server/src/services/global/index.ts`
- `apps/admin/server/src/services/auth/oauth/*.ts`
- `apps/admin/server/src/services/system/user/index.ts`
- 必要时同步 `apps/admin/server/src/types/errors.ts`

**预期产物**

- 业务校验失败统一改为 `ValidationError`
- 权限或 owner 校验失败统一改为 `PermissionError` / `AuthError`
- 资源不存在统一改为 `NotFoundError`
- 不支持操作、绑定冲突、配置缺失等场景收敛到明确的 `BusinessError` 子类或已存在错误码

**验证要求**

- 业务失败不再默认落成 `500`
- 服务端响应中的 `status / body.code / message` 可以稳定推导

**当前状态**

- 已完成
- 已将文章、评论、片段、全局上传、OAuth 绑定/登录等高频业务入口收敛到 `BusinessError` 体系
- 当前仍保留的少量原始 `Error` 主要属于基础设施或专项错误治理范围，不再属于这次前后端契约对齐主线

---

### E-03 修正服务端 `401/404/body.code` 特例

**任务目的**

收口当前最容易让前端误判的几条特殊错误链路，确保未登录、无权限、资源不存在和未知路由有稳定边界。

**当前已发现的问题**

- 未命中的受保护 API 路由目前会被 `jwtAuth` 先拦成 `401`，不是 `404`
- `jwtAuth` 和 `checkPermission` 有多处直接 `Response.error('xxx')`，导致 `HTTP status` 与 `body.code` 不一致
- 权限中间件异常路径仍然是本地手写响应，没有完全走统一错误契约

**涉及范围**

- `apps/admin/server/src/app.ts`
- `apps/admin/server/src/middlewares/auth.ts`
- `apps/admin/server/src/middlewares/error-handler.ts`
- `apps/admin/server/src/config/public-routes.ts`

**预期产物**

- 未登录只返回 `401`
- 权限不足只返回 `403`
- 资源不存在或路由不存在返回 `404`
- 所有 `401/403/404/500` 响应都满足 `body.code === HTTP status`

**验证要求**

- `/api/auth/checkLogin` 未登录时返回一致的 `401`
- 未命中的后台 API 不再误触发登录失效逻辑
- 前端不会把“接口不存在”误判成“请重新登录”

**当前状态**

- 已完成
- `jwtAuth` 现在会放行未知 `/api/*` 路径到下游 `404`
- `401/403/404/500` 手写响应已统一 `body.code === HTTP status`

---

### E-04 前端请求层统一消费错误响应

**任务目的**

把 Admin Client 的请求层收敛成一套稳定的失败消费方式，让服务端真实 `4xx/5xx` 能被正确转成页面级错误提示和登录态控制流。

**当前已发现的问题**

- `request.ts` 成功分支依赖 `res.code === 0`
- `request.ts` 失败分支对 `401` 只靠 `status`，对 `400/403/404` 却没有读取 `response.data.message`
- 当前很多失败提示最终只显示 Axios 默认文案，而不是后端真实业务提示

**涉及范围**

- `apps/admin/client/src/utils/request.ts`
- `apps/admin/client/src/session/bootstrapAuth.ts`
- 必要时同步 `apps/admin/client/src/utils/authStorage.ts`

**预期产物**

- `request.ts` 在 Axios 异常分支优先提取后端 `response.data.message`
- `401` 继续由请求层统一做 refresh / redirect
- `400/403/404/500` 转成带真实业务文案的 `Error`
- 成功分支继续只允许 `code === 0`

**验证要求**

- 登录失败、表单校验失败、权限不足、资源不存在都能在页面拿到真实业务文案
- 非 `401` 错误不会误触发跳登录

**当前状态**

- 已完成
- `request.ts` 现在会优先读取服务端 `response.data.message`
- 除 `401` 重定向提示外，通用错误提示不再由请求层直接弹出，避免和页面层重复提示
- 页面和 store 捕获到的 `Error.message` 已经与服务端业务语义对齐

---

### E-05 页面与 store 清理旧失败模型依赖

**任务目的**

清理页面层和 store 层仍然依赖“失败时还能拿到 `res.code !== 0` 成功返回值”的旧写法，保证所有错误提示真正和请求层契约一致。

**当前已发现的问题**

- 登录页会用 `error.message.includes('验证码')` 做字段错误分流
- 上传、个人资料、OAuth 解绑等页面对 `error.message` 的来源假设不稳定
- 一些 store 仍保留 `if (res.code === 0) ... else message.error(res.message)` 的历史分支

**涉及范围**

- `apps/admin/client/src/pages/Login/index.tsx`
- `apps/admin/client/src/pages/System/user/profile/index.tsx`
- `apps/admin/client/src/components/Upload/DragUpload.tsx`
- `apps/admin/client/src/components/Upload/ImageUpload.tsx`
- `apps/admin/client/src/stores/user.ts`
- 其他直接依赖 `request.ts` 旧失败模型的页面 / hooks

**预期产物**

- 页面层统一从请求层拿到可直接展示的业务文案
- 登录、上传、绑定/解绑、个人资料等典型场景提示稳定
- 页面层不再自己猜 Axios 默认错误文案

**验证要求**

- 常见页面的失败提示语与后端 `message` 一致
- 业务字段级提示与全局 toast 不再互相打架

**当前状态**

- 已完成
- `user store` 中直接依赖旧失败模型的 OAuth 相关分支已经收敛
- 现有页面层大多已经通过 `catch(error)` + `error.message` 展示错误，随着 `request.ts` 契约统一后无需再大面积翻修

---

### E-06 建立前后端错误联调与回归清单

**任务目的**

用一组聚焦场景把新的错误契约真正打通，避免后续任何一边继续单独演化。

**当前已发现的问题**

- 当前服务端测试和前端页面体验并没有形成统一闭环
- 认证失效、权限不足、校验失败、资源不存在、上传失败这些最关键的用户感知场景还缺一份跨端验收清单

**涉及范围**

- `apps/admin/server/tests/**`
- `apps/admin/client/src/utils/request.ts`
- `apps/admin/server/docs/server-release-smoke-list.md`
- 必要时补充 `apps/admin/server/docs/` 或 `docs/release/` 里的跨端错误契约说明

**预期产物**

- 一份前后端共同使用的错误联调 smoke 列表
- 至少覆盖：
    - 未登录
    - token 过期
    - 参数校验失败
    - 权限不足
    - 资源不存在
    - 上传类型不合法
    - 上传大小超限
- 关键请求层和服务端中间件有最小自动化保护

**验证要求**

- 场景能明确验证：
    - 服务端返回的 status/code/message
    - 前端页面最终提示
    - 是否发生 refresh / redirect

**当前状态**

- 已完成
- 已完成的验证：
    - `pnpm exec vitest run apps/admin/client/src/utils/request-errors.test.ts`
    - `pnpm --filter @blog/server test tests/auth/jwt-auth.test.ts`
    - `pnpm build:server`
    - `pnpm build:admin`
    - 真实 smoke：
        - `GET /health -> 200 + code 0`
        - `GET /api/auth/checkLogin -> 401 + code 401 + message 未登录`
        - `GET /api/not-found -> 404 + code 404 + message 接口不存在`
        - `POST /api/auth/login {}` -> 400 + code 400 + message 用户名、密码和验证码不能为空`

## 十一、当前明确可执行的任务：F. 错误与异常治理专项

### F-01 建立“单次异常单点记录”规则

**任务目的**

把当前“同一条异常在 service、controller、global 三处重复记录”的行为收口成真正的请求级单点日志，避免日志爆炸、排障误导和不必要的性能损耗。

**当前已发现的问题**

- 一个 `AuthError('未登录')` 会在 `ServiceErrorHandler`、`ControllerErrorHandler`、`errorHandler` 各打一遍
- 访问日志之外还会额外产生多条结构化错误日志，导致同一次请求被重复放大
- 目前没有清晰规则说明“谁负责最终落日志，谁只负责补充上下文”

**涉及范围**

- `apps/admin/server/src/utils/decorators/error.ts`
- `apps/admin/server/src/middlewares/error-handler.ts`
- `apps/admin/server/src/utils/logger.ts`
- 必要时补充 `apps/admin/server/src/types/errors.ts`

**预期产物**

- 一条明确规则：
    - 请求级异常只允许一条主错误日志
    - 访问日志继续单独保留
    - 业务型 `4xx` 与系统型 `5xx` 分级记录
- 装饰器不再直接作为最终日志出口
- 错误对象或 `ctx.state` 上有统一的上下文挂载点，供全局中间件最终记录

**验证要求**

- `GET /api/auth/checkLogin` 未登录时，终端只出现一条主错误日志和一条访问日志
- `POST /api/auth/login` 参数错误时，不再出现三份重复栈信息

**当前状态**

- 已完成
- `ServiceErrorHandler` 和 `ControllerErrorHandler` 不再直接写最终错误日志
- 全局 `errorHandler` 成为唯一请求级主错误日志出口
- 真实启动 `GET /api/auth/checkLogin` 已验证：
    - 一条访问日志
    - 一条结构化 `WARN`
    - 不再出现 service/controller 重复日志

---

### F-02 重构装饰器为“补充上下文而非重复打日志”

**任务目的**

保留 `ServiceErrorHandler` / `ControllerErrorHandler` 的定位价值，但去掉它们当前直接写日志造成的重复输出和热路径开销。

**当前已发现的问题**

- `ServiceErrorHandler` 当前每次异常都要对参数做 `sanitizeForLog` 并直接 `logger.error`
- `ControllerErrorHandler` 也会重新构造一次请求上下文并直接 `logger.error`
- 这会导致一次异常至少做两次对象清洗、两次结构化序列化，再交给全局中间件重复处理

**涉及范围**

- `apps/admin/server/src/utils/decorators/error.ts`
- `apps/admin/server/src/utils/decorators/sanitize.ts`
- `apps/admin/server/src/utils/decorators/index.ts`

**预期产物**

- 装饰器改为：
    - 收集 `className` / `methodName` / 精简后的安全上下文
    - 挂到 error metadata 或 request context 上
    - 不直接输出最终错误日志
- 对预期业务错误默认不保留完整堆栈副本，避免重复开销

**验证要求**

- 装饰器仍能保留来源定位能力
- 异常日志数量明显下降
- 对热路径请求的额外对象处理次数减少

**当前状态**

- 已完成
- 装饰器现在只负责给 error 附加 `service/controller/permission` 上下文
- `4xx` 默认不再重复附带 stack，也不再在装饰器层做重日志序列化

---

### F-03 收敛认证、权限与缓存异常出口

**任务目的**

把未登录、无权限、权限缓存失效、Redis/DB 异常这些性质完全不同的情况拆开，禁止真实系统故障被伪装成普通 `403`。

**当前已发现的问题**

- `PermissionCacheService.getUserPermissions` 出错时会吞掉异常并返回空数组
- 下游 `hasPermission` / `hasAnyPermission` 会把它当成“没有权限”，最终变成 `403`
- `RequirePermission` 和 `checkPermission` 现在仍是两套错误处理模型

**涉及范围**

- `apps/admin/server/src/utils/auth.ts`
- `apps/admin/server/src/utils/decorators/permission.ts`
- `apps/admin/server/src/middlewares/auth.ts`
- 必要时同步 `apps/admin/server/src/types/errors.ts`

**预期产物**

- 未登录稳定返回 `401`
- 真正无权限稳定返回 `403`
- 权限缓存或底层依赖故障明确返回 `500` 或语义化系统异常
- 权限链路不再通过“返回空权限”吞掉真实问题

**验证要求**

- Redis/DB 故障不会再被误判成“缺少必要权限”
- 权限相关日志能明确区分业务拒绝和系统故障

**当前状态**

- 已完成
- `PermissionCacheService.getUserPermissions` 不再吞错返回空数组
- 权限缓存/Redis/DB 故障现在会明确抛成 `500`
- `RequirePermission` 的异常边界已收紧，不会再把 controller 内部普通错误误包装成“权限验证失败”

---

### F-04 清理剩余裸 `Error` 与基础设施异常映射

**任务目的**

把仍游离在统一错误体系之外的基础设施错误补齐映射，避免搜索、邮件、AI、配置类故障继续以无语义的裸 `Error` 形式漂移。

**当前已发现的问题**

- 搜索服务里仍有裸 `Error`
- 邮件、DeepSeek、环境配置等基础设施层仍存在无统一语义的异常抛出
- 这些错误有些应该在启动期 fail fast，有些应该在请求期映射成明确 `5xx`

**涉及范围**

- `apps/admin/server/src/services/search/article.ts`
- `apps/admin/server/src/utils/email/**`
- `apps/admin/server/src/utils/deepseek.ts`
- `apps/admin/server/src/config/*.ts`
- `apps/admin/server/src/lib/meilisearch.ts`

**预期产物**

- 启动期配置异常与请求期依赖异常边界清晰
- 剩余请求链路内裸 `Error` 显著减少
- 对外状态码和日志语义更稳定

**验证要求**

- MeiliSearch / 邮件 / AI 未配置时的行为可以被明确推导
- 请求期基础设施故障不再混成无语义 `500`

**当前状态**

- 已完成
- 搜索服务中的裸 `Error` 已改为语义化 `BusinessError`
- 搜索服务内部 `logger.error + rethrow` 的重复日志模式已去除
- 登录参数校验热路径中的一处裸 `Error` 已改为 `ValidationError`
- 上传服务中的输入错误和对象存储配置错误已改为 `ValidationError` / `FileError`
- 邮件重试失败和 DeepSeek 关键请求路径已改为语义化 `BusinessError`
- OAuth、评论、文章、片段、邮件模板和 dashboard websocket 请求链路中的裸 `Error` 已完成清理
- 当前保留的 `new Error(...)` 只剩启动期 fail-fast 配置和底层 websocket helper，不再属于普通请求异常链路

---

### F-05 优化错误日志性能与负载

**任务目的**

确保错误治理不会通过过度日志化反向拖慢请求，把这次专项真正做成“更稳也更轻”。

**当前已发现的问题**

- 当前错误日志会频繁构造大对象、完整堆栈和清洗后的请求体
- 预期的 `4xx` 业务失败也会走接近 `5xx` 的重日志路径
- 重复序列化与重复日志会直接放大请求尾延迟

**涉及范围**

- `apps/admin/server/src/utils/logger.ts`
- `apps/admin/server/src/utils/decorators/error.ts`
- `apps/admin/server/src/middlewares/error-handler.ts`
- 必要时同步 `apps/admin/server/src/utils/decorators/sanitize.ts`

**预期产物**

- `4xx` 默认轻量日志：
    - 无重复 stack
    - 无大体积 body
    - 只保留必要定位字段
- `5xx` 保留完整诊断能力
- 日志采集策略按错误级别分层

**验证要求**

- 常见 `401/403/400` 不再打印重型栈日志
- 错误处理调整后请求耗时没有明显恶化

**当前状态**

- 已完成
- `4xx` 现已默认走轻量错误日志：
    - 无重复 stack
    - 无完整 controller body
    - 仅保留必要定位字段
- `5xx` 仍保留完整 stack 与上下文
- 真实链路 `GET /api/auth/checkLogin` 已观测到 `401 6ms`

---

### F-06 建立错误治理专项回归与基线

**任务目的**

用一组专项验证把“只记录一次、状态正确、性能不倒退”锁住，避免这块后面再次回潮。

**当前已发现的问题**

- 当前测试虽然覆盖了部分错误语义，但没有明确锁住“日志数量”和“重复记录”问题
- 也没有一份专门面向错误治理的最小性能基线

**涉及范围**

- `apps/admin/server/tests/platform/error-handling.test.ts`
- `apps/admin/server/tests/platform/access-log-behavior.test.ts`
- `apps/admin/server/tests/controllers/auth-error-semantics.test.ts`
- 必要时新增 `apps/admin/server/tests/platform/error-logging.test.ts`
- 必要时新增 `apps/admin/server/docs/` 下的专项 smoke 文档

**预期产物**

- 自动化覆盖：
    - 单次异常只记录一次
    - 401/403/404/500 状态正确
    - 权限缓存故障不伪装成 403
- 一份专项 smoke 清单，覆盖真实日志输出与请求耗时观察

**验证要求**

- 至少一条真实链路验证“访问日志 1 条 + 主错误日志 1 条”
- 关键 `4xx` 错误路径有最小耗时对比或基线说明

**当前状态**

- 已完成
- 自动化已覆盖：
    - 单次异常只记录一次
    - 权限缓存故障不再伪装成 `403`
    - 搜索配置故障已映射成语义化 `500`
    - 上传缺文件、摘要空内容等输入错误已锁成 `400`
    - 文章不存在、片段不存在、评论越权、GitHub 绑定冲突等业务失败已锁成对应语义异常
- 真实 smoke 已验证：
    - `/api/auth/checkLogin` 只出现一条访问日志和一条主错误日志
    - 请求耗时当前观测为 `7ms`
- 专项基线文档已落在 `apps/admin/server/docs/server-error-governance-baseline.md`
- 当前专项已经具备最小自动化回归、真实 smoke 与文档基线

## 十二、当前建议的执行顺序

当前建议按下面顺序推进：

1. `F-05` 优化错误日志性能与负载
2. `F-06` 建立错误治理专项回归与基线
3. `F-04` 清理剩余裸 `Error` 与基础设施异常映射
4. `A-01` 收敛后台权限矩阵
5. `A-02` 统一认证与会话安全配置
6. `A-03` 收敛公共入口与上传能力
7. `B-01` 修复 HTTP 错误语义
8. `B-02` 统一错误处理装饰器与异常链路
9. `B-03` 修复查询参数解析与路由文档漂移
10. `B-04` 移除进程内关键状态
11. `C-01` 建立后台服务端最小回归矩阵
12. `C-02` ~ `C-05` 作为第二阶段治理任务继续推进
13. `D-03` 统一装饰器使用策略与覆盖范围
14. `D-04` 校正错误日志、访问日志与响应状态一致
15. `D-02` 拆分 decorators 模块
16. `D-01` 统一目录、文件命名与模块边界
17. `D-06` 清理半成品与不统一模块
18. `D-05` 拆分超大 service/controller 文件
19. `E-01` 固化前后端统一错误契约
20. `E-02` 服务端统一业务异常与状态码映射
21. `E-03` 修正服务端 `401/404/body.code` 特例
22. `E-04` 前端请求层统一消费错误响应
23. `E-05` 页面与 store 清理旧失败模型依赖
24. `E-06` 建立前后端错误联调与回归清单

## 十三、当前不建议先做的事

以下事项当前不是第一优先级：

- 大规模重写整个 auth 架构
- 一次性把所有 `any` 清零
- 上线前做大范围目录重命名
- 上线前引入新的消息队列或全新基础设施体系
- 为了风格统一而提前打散大量成熟业务文件

这些事并不是不做，而是要在 P0 风险收敛之后再进入。
