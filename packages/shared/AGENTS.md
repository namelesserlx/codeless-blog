# packages/shared — 共享契约层

跨端共享的类型定义、常量和纯工具函数。所有端 (blog, admin-client, admin-server) 都依赖此包，确保接口契约一致。

## 引用 Skill

共享包管理规范、跨端修改流程 → 执行 `/blog-arch`

## 关键文件

```
src/index.ts              # 统一导出入口
src/types/                # 类型 (auth, blog:article/comment/photo/snippet/tag, system:user/role/permission, dashboard)
src/utils/                # 纯工具 (ip, metrics, storage)
src/rbac.ts               # RBAC 权限常量
```

## 本地注意点

- **不引入任何运行时依赖**——所有端都依赖此包
- 修改后必须 `build`，消费端需要重启 dev server
- 只放跨端共享内容，应用私有类型留在各自的 `types/` 下
- 向后兼容优先：改类型优先加 optional 字段而非 breaking change
