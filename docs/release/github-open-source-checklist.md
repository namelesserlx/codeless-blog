# GitHub 开源发布检查清单

这份清单只覆盖 GitHub / MIT 开源前后的仓库级准备，不涉及业务功能改造。

## 已在仓库内补齐的基础文件

- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`

## 初始化新仓库后，建议第一时间完成

1. 创建新仓库，例如 `namelesserlx/codeless-blog`
2. 在仓库 About 区域补齐：
    - Description
    - Homepage URL
    - Topics
3. 上传 Social Preview 图，优先使用 `docs/readme/home-desktop.png` 或单独导出一张 1280x640 封面
4. 检查 GitHub Community Standards，确保 License / Readme / Contributing / Code of Conduct / Security Policy 全部为绿色

提示：

- `Code of Conduct` 文件我已经在仓库里补上了，但 GitHub 文档说明 Community Standards 中这一项通常只有使用网页端模板创建时才一定会显示为绿色。
- 如果你发现这一项没有被识别，直接在 GitHub 仓库页用内置模板重新保存一次 `CODE_OF_CONDUCT.md` 即可。

## 推荐 Topics

- `nextjs`
- `react`
- `koa`
- `prisma`
- `meilisearch`
- `typescript`
- `tailwindcss`
- `monorepo`
- `blog`
- `cms`
- `rbac`
- `pwa`

## 建议打开的 GitHub 功能

- Issues
- Pull Requests
- Dependency Graph
- Dependabot Alerts
- Dependabot Security Updates
- Secret Scanning
- Push Protection

如果你准备长期维护社区协作，再考虑开启：

- Discussions
- Projects
- GitHub Sponsors / Funding

## 分支与保护建议

- 默认分支使用 `main`
- 打开 branch protection / ruleset
- 至少要求：
    - PR review
    - conversation resolved
    - status checks 通过后才能 merge

如果暂时还没有稳定的 GitHub Actions 工作流，可以先只要求 PR review，等 CI 稳定后再把 status checks 加进去。

## 发布 MIT 前的最后人工复查

- README 中的仓库链接、截图、命令路径是否与新仓库名一致
- `.env.example` 是否没有敏感信息
- 是否还存在演示占位文案、测试账号、私有链接、个人隐私信息
- Docker / 部署文档中的域名示例是否足够明确，不会被误认为真实生产地址
- 是否需要补一张真正用于 GitHub Social Preview 的封面图

## 首次公开发布动作建议

1. 删除当前 `.git`
2. `git init`
3. 创建 GitHub 新仓库
4. 首次提交包含基础社区文件与 README
5. 推送 `main`
6. 检查仓库首页展示、Community Standards、Issue / PR 模板是否正常
7. 创建 `v0.1.0` 或首个里程碑标签，作为公开起点
