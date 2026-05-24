# PWA 功能设置指南

本项目已集成了完整的 PWA (Progressive Web App) 功能，包括：

- ✅ Web App Manifest
- ✅ 应用安装提示

## 环境配置

### 更新域名配置

在 `app/layout.tsx` 中更新 `metadataBase` 为你的实际域名：

```typescript
metadataBase: new URL('https://your-actual-domain.com'),
```

## 功能说明

### 应用安装

- **Android/Chrome**: 自动显示安装提示横幅
- **iOS/Safari**: 显示手动安装指引
- **桌面端**: 地址栏显示安装图标

### 当前边界

- 当前不再提供浏览器 Push 订阅能力
- 当前不注册 Service Worker
- 当前不提供离线阅读缓存，文章和静态资源缓存优先交给 CDN 与浏览器 HTTP 缓存

## 测试 PWA 功能

### 本地测试

```bash
# 启用 HTTPS 的开发服务器
npm run dev -- --experimental-https
```

### 生产环境

PWA 功能需要在 HTTPS 环境下运行，确保部署到支持 HTTPS 的服务器。

## 自定义配置

### 更新 Manifest

编辑 `app/manifest.ts` 来调整应用名称、图标、主题色等。

## 注意事项

1. **HTTPS 要求**: PWA 功能仅在 HTTPS 环境下可用
2. **浏览器兼容性**: 不同浏览器对 PWA 功能支持程度不同
3. **iOS 限制**: iOS Safari 对 PWA 功能有一些限制
4. **缓存策略**: 文章和静态资源缓存优先交给 CDN 与浏览器 HTTP 缓存

## 调试

### Chrome DevTools

- Application > Manifest: 检查 manifest 配置
- Application > Service Workers: 确认当前站点没有注册 Service Worker

### 测试清单

- [ ] Manifest 文件正确加载
- [ ] 当前站点没有注册 Service Worker
- [ ] 安装提示正常显示
