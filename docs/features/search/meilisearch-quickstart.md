# MeiliSearch 快速开始指南

本指南将帮助你在 5 分钟内启动并测试 MeiliSearch 搜索功能。

## 🚀 快速开始（5 步完成）

### 步骤 1: 启动 MeiliSearch 服务

```bash
# 在项目根目录执行
docker compose --env-file .env.development up -d meilisearch

# 验证服务已启动
curl http://localhost:7700/health
# 应该返回: {"status":"available"}
```

### 步骤 2: 配置环境变量

优先在根目录 `.env.development` 中配置：

```env
MEILI_URL=http://localhost:7700
MEILI_ADMIN_KEY=your_meili_admin_key
MEILI_SEARCH_KEY=your_meili_search_key
```

如果只想局部覆盖，再在：

- `apps/admin/server/.env.development`
- `apps/blog/.env.development`

中覆盖同名变量。

### 步骤 3: 初始化索引

```bash
# 进入管理后台 server 目录
cd apps/admin/server

# 运行初始化脚本
pnpm run init-search:dev
```

你应该看到类似输出:

```
🚀 开始初始化 MeiliSearch...
📋 步骤 1: 初始化索引配置...
✅ MeiliSearch 索引初始化成功
📋 步骤 2: 索引所有现有文章...
🔄 开始重新索引所有文章...
✅ 重新索引完成，共 XX 篇文章
✅ MeiliSearch 初始化完成！
```

### 步骤 4: 启动服务

```bash
# 启动管理后台 server（如果还没启动）
cd apps/admin/server
pnpm run dev

# 启动博客前端（新终端窗口）
cd apps/blog
pnpm run dev
```

### 步骤 5: 测试搜索功能

1. 打开浏览器访问博客: http://localhost:3000
2. 按下 `Cmd + K` (Mac) 或 `Ctrl + K` (Windows/Linux)
3. 在搜索框中输入关键词,例如: "Next.js"
4. 查看实时搜索结果！

---

## 📝 测试清单

完成以下测试确保搜索功能正常工作:

- [ ] ✅ MeiliSearch 服务已启动
- [ ] ✅ 环境变量已配置
- [ ] ✅ 索引初始化成功
- [ ] ✅ 前端搜索框可以打开
- [ ] ✅ 输入关键词有搜索结果
- [ ] ✅ 点击结果可以跳转到文章页
- [ ] ✅ 按标签搜索正常
- [ ] ✅ 热门文章推荐正常

---

## 🧪 快速测试命令

### 测试搜索 API

```bash
# 测试基础搜索
curl "http://localhost:3000/api/search?q=Next.js&limit=5"

# 测试搜索建议
curl "http://localhost:3000/api/search/suggestions?limit=5"

# 测试标签搜索
curl "http://localhost:3000/api/search/tags?tag=React&limit=5"
```

### 测试后台同步

1. **创建新文章** - 打开管理后台,创建一篇新文章
2. **搜索新文章** - 在博客前端搜索新文章标题
3. **验证同步** - 应该能立即搜索到新文章

---

## ⚠️ 常见启动问题

### 问题 1: Docker 容器无法启动

```bash
# 解决方案: 清理并重启
docker-compose down
docker-compose up -d meilisearch
docker logs blog-meilisearch
```

### 问题 2: 端口 7700 已被占用

```bash
# 查看占用端口的进程
lsof -i :7700

# 修改 docker-compose.yml 中的端口映射
ports:
  - "7701:7700"  # 改用 7701

# 同时修改环境变量
MEILI_URL=http://localhost:7701
```

### 问题 3: 索引初始化失败

```bash
# 检查 MeiliSearch 是否运行
curl http://localhost:7700/health

# 检查环境变量是否正确
echo $MEILI_URL
echo $MEILI_ADMIN_KEY

# 重新初始化
pnpm run init-search:dev
```

### 问题 4: 搜索无结果

1. **检查索引是否创建成功:**

    ```bash
    curl http://localhost:7700/indexes/articles \
      -H "Authorization: Bearer your_meili_admin_key"
    ```

2. **检查文档数量:**

    ```bash
    curl http://localhost:7700/indexes/articles/stats \
      -H "Authorization: Bearer your_meili_admin_key"
    ```

3. **重新索引:**
    ```bash
    cd apps/admin/server
    pnpm run init-search:dev
    ```

---

## 🎯 下一步

搜索功能已经启动并运行!你可以:

1. **阅读完整文档**: 查看 `MEILISEARCH_SETUP.md` 了解详细配置
2. **自定义搜索**: 修改 `apps/blog/components/search/search-modal.tsx`
3. **调整索引配置**: 编辑 `apps/admin/server/src/lib/meilisearch.ts`
4. **监控搜索性能**: 访问 http://localhost:7700 查看管理界面

---

## 📚 相关资源

- [MeiliSearch 完整配置文档](./MEILISEARCH_SETUP.md)
- [MeiliSearch 官方文档](https://docs.meilisearch.com/)
- [搜索 API 文档](./MEILISEARCH_SETUP.md#6-api-接口)

---

**有问题?** 查看 [常见问题](./MEILISEARCH_SETUP.md#10-常见问题) 或提交 Issue。
