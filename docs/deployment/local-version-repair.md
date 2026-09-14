# 本地版本迭代修复记录

2026-09-14。本记录仅适用于本机已有历史数据库，不改变生产迁移策略。

## 原因与修复

- 前端已更新但后端仍运行 9 月 9 日的旧 JAR，产品线返回值没有 versions，导致列表为空。
- 空日期字符串写入 MySQL DATE 失败。现在后端规范化为空值；更新时区分字段缺失与明确清空，校验日期格式及先后顺序。
- 数据库历史 1.0.28–1.0.34 来自旧工作台项目，与当前分支的产品线迁移编号冲突。

## 本地迁移目录

执行 `scripts/prepare-local-migrations.ps1 -HistoricalMigrationDirectory <历史脚本目录>`，得到 `.enterprise-app-factory/runtime/local-migrations`。该脚本保留历史 1.0.0–1.0.34，追加当前分支的四项产品线变更为 1.0.35–1.0.38。已存在但内容不同的脚本会拒绝覆盖。

本次历史源：`D:/project/maomao-shichuang-admin/project-src/backend/src/main/resources/db/migration`。Flyway 已验证全部 39 项校验和，保留校验功能，未 repair 或覆盖历史记录。

备份：`.enterprise-app-factory/runtime/backups/before-version-repair-20260914-131014.sql`。备份含业务数据，仅本机保存，不提交。

## 后端重建与启动

从项目根目录执行：

```powershell
& .tools/apache-maven-3.9.11/bin/mvn.cmd -f backend/pom.xml clean package '-Dtest=ProductVersionDatesTest,ProductLineControllerIntegrationTest' '-Dspring.flyway.locations=filesystem:D:/project/manage_admin/.enterprise-app-factory/runtime/local-migrations'
```

当前运行包：`.enterprise-app-factory/runtime/version-repair-backend.jar`，由本次构建产物复制。重启前检查服务注册表和 8080 端口，并确认进程属于本项目；停止已核实的后端后再替换运行包。

```powershell
java -jar .enterprise-app-factory/runtime/version-repair-backend.jar --server.port=8080 --spring.flyway.locations=filesystem:D:/project/manage_admin/.enterprise-app-factory/runtime/local-migrations
```

本地数据库不能直接使用当前分支默认 classpath 迁移集。不要关闭校验或执行 flyway repair 绕过历史冲突。生产数据库使用其自己的迁移历史。

## 服务注册与验证

当前 Windows 插件通过 os.kill(pid, 0) 判断进程存活，不适用于 Windows。登记为外部服务且不传 pid，使用端口及 health-url 判断；停止服务时需核实端口对应进程后再停止，不能依赖外部登记执行停止。

- 前端 http://127.0.0.1:3010；后端 http://127.0.0.1:8080。
- 后端 6 项测试通过，覆盖真实事务内创建、修改、清空日期、拒绝倒置日期和版本嵌入读取；测试数据事务回滚。
- 前端类型检查、12 项相关测试、构建通过；构建存在大包警告。
- 通过前端代理查询，原有两条版本均在产品线的 versions 字段返回。
- PRD 已更新 1.1.27，自动校验因本地缺少 PRD registry 无法完成。

## 回退与后续

本次只增加可空字段和新表，保留旧数据与旧迁移。若应用回退，先停新后端，重新构建旧应用并验证读取；不要自动删除新增表或覆盖数据库。全库恢复会覆盖备份之后的业务写入，必须另行确认。

并行工作树隔离代码，不自动隔离数据库。OKR 会话新增迁移应使用独立数据库或在合并时统一迁移编号；此本机兼容目录不能自动吸收其他分支的新迁移。
