# 后台服务端命名与风格治理边界

这份文档不是一次性重构计划，而是上线前的治理边界说明，用来明确“哪些要现在收、哪些放到上线后做”。

## 一、当前已经确认的漂移点

这轮已经完成的命名治理包括：

- `src/controllers/blog/article-report`
- `src/routes/blog/article-report`
- `src/services/blog/article-report`
- `src/config/*-config.ts`
- `src/utils/cos.ts`
- `src/utils/port.ts`
- `src/services/email/notification.ts`

当前剩余更偏“模块边界约定”的点主要是：

- `global/index.ts`、大量 `index.ts` 的语义边界仍然需要后续收敛
- `strict: false`、`strictNullChecks: false`、`noImplicitAny: false`
- 局部 `any`、`ctx.query as ...`、历史遗留 `console.*`

## 二、这轮已经做完什么

- 已将最明显的 camelCase / dotted naming 收敛为 `kebab-case`
- 已同步代码、测试与活跃文档里的新路径
- 已用定向测试和构建确认运行链路没有因重命名断开

## 三、后续仍不建议一次性做什么

- 不在上线前继续扩大到更多高风险目录重命名。
- 不全面开启 TypeScript strict 模式。
- 不为了风格统一去拆大型成熟业务文件。
- 不一次性清零所有 `any`。

## 四、上线后建议的治理顺序

1. 优先处理已识别的命名漂移目录，并同步 controller / route / service 引用。
2. 再补模块级 barrel 边界，减少无语义的 `index.ts` 扩散。
3. 再收紧 TypeScript 编译选项，优先打开 `strictNullChecks`。
4. 最后按业务风险拆大文件，优先 auth、dashboard、article service。

## 五、增量规则

- 新增文档统一使用 `kebab-case`。
- 新增普通工具、配置模块优先 `kebab-case` 文件名。
- 新代码不要再引入 `console.*`，统一走 [logger.ts](../src/utils/logger.ts)。
- 新增运行时配置时，优先放进 `src/config/**` 并补 env 契约说明。
