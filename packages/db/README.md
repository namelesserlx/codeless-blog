# 启动脚本命令

- prisma generate：生成 Prisma Client。每次修改 schema.prisma 文件后都需要运行此命令，让 Prisma 根据 schema 生成 TypeScript 类型和数据库操作方法。
- prisma db push --skip-generate：将 schema 直接推送到数据库（不生成迁移文件），并跳过 Client 生成步骤。适合开发环境快速迭代，但生产环境建议用迁移。
- prisma studio：启动 Prisma Studio 可视化数据库管理工具，可直接在浏览器中查看和编辑数据。
- prisma migrate dev：创建迁移文件并应用到数据库，同时生成 Prisma Client。开发环境常用，会自动生成有意义的迁移名称。
- prisma migrate deploy：将未应用的迁移文件应用到生产数据库，生产环境部署必备命令。
- prisma migrate status：查看数据库迁移状态，显示哪些迁移已应用、哪些未应用。
- prisma migrate resolve：手动解决迁移过程中卡住的状态（如迁移文件丢失但数据库已变更）。
- prisma migrate reset --force：重置数据库（删除所有数据并重新应用所有迁移），用于开发环境快速重置数据。
- prisma db seed：执行数据种子脚本，向数据库插入初始数据（需配合 seed 配置）。
