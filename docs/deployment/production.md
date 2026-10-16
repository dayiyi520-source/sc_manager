# Mock 演示站部署

发布目标为用户确认的 https://cp.stringedu.com/sc-manager-frontend/，前端目录为 /opt/sc-manager-frontend/dist。历史 /manage-admin/ 是另一应用，本流程不切换其目录、不部署其后端、不修改数据库。

部署入口为 scripts/deploy-production.sh。Windows 使用其委托的 Python 入口：

本纯前端项目在未显式配置时，开发及普通生产构建均默认使用 Mock；接口传输测试仍默认使用测试请求。只有显式设置 `VITE_MOCK_MODE=false` 才关闭 Mock，该兼容选项不用于本站正常发布。现有部署脚本继续显式开启 Mock，不改变发布方式。

`npm run build` 可用于构建检查，但不会自动设置线上专属子路径、打包共享数据和安装 Mock 文件服务，不能代替完整发布入口。线上发布仍使用下述脚本完成资源路径、共享数据、备份和切换。

```powershell
python scripts/deploy_frontend_mock.py --project . --source-dir <已验证的独立源码快照目录> --revision <源码提交号>
```

准备命令从 stringplugin 根目录执行，使用已核实的静态 Mock 站专用配置：

```text
python scripts/prepare_deployment.py --project <项目目录> --environment prod --config .enterprise-app-factory/config/frontend-deployment.json
```

专用配置 database.mode=none，不要求数据库替换。凭证只从 .enterprise-app-factory/secrets/runtime.env 或环境变量读取，不写入脚本和发布包。源目录为已提交版本的独立快照；构建使用项目专属路径和 Mock 模式，以源码版本作为演示缓存版本。

## 共享 Mock 数据

数据库初始快照、产研任务样例编译进静态资源；最新 src/data/mockOkrState.json 和 src/data/mockResearchTemplate.json 同时上传并初始化 /opt/sc-manager-frontend/shared/mock/ 下的目标复盘及产研模板文件。目标总结设置包含在目标状态文件中。保存成功会写入共享文件，浏览器仅缓存；失败及并发旧版本提交明确提示，不显示虚假的成功。

服务单元为 sc-manager-frontend-mock.service，以无登录权限的 sc-manager-mock 用户运行，只能写入本项目共享 Mock 目录及运行时目录。使用 Unix socket /run/sc-manager-frontend-mock/mock.sock，由专属 Nginx 路径 /sc-manager-frontend/api/mock/ 转发。写入仅接受本站 Origin 和 JSON，并校验格式及版本；不接受任意文件路径。该服务属于纯前端 Mock 演示，不替代正式后端的认证、租户和业务权限校验。

每次发布备份原 Nginx 路由、服务单元及共享数据。目标数据更新保留服务器更高版本记录及未包含在新样例中的记录；产研模板以此次上传的最新源码样例更新。后续线上保存独立于发布目录；需把服务器共享数据同步回源码才能将线上编辑带到其他独立环境。

## 发布、核验与回滚

预检专属路由与 nginx -t；上传到 incoming，解压独立 releases 目录，保留旧资源支持打开中的页面。初始化共享数据及服务、核对健康状态，再原子切换 dist 链接。核验公共 index、JS、业务直达路由、Mock 健康状态及两份数据。release.json 记录源码版本、发布编号和上传 Mock 快照摘要，不含凭证。

失败时切回上一 dist，并调用该发布目录 mock-service/setup.py 的 --rollback 模式恢复本次 backups 中保存的 Nginx、服务单元及原共享文件。手工回滚时从 backups/<发布编号>/previous-target.txt 读取旧目录；首次目录切换的旧站位于 backups/<发布编号>/dist。不得删除其他应用、数据库或历史备份。

上次已核实的发布：20261016T152916Z，源码 3a337f9。

## 最近成功发布

- 发布时间：2026-10-16 23:29:16（北京时间）。
- 发布编号：20261016T152916Z；发布源码：3a337f94b6bb33ddea75979b65952dd45ebd0803。
- 发布目录：/opt/sc-manager-frontend/releases/20261016T152916Z。
- 回滚备份：/opt/sc-manager-frontend/backups/20261016T152916Z；上一版本为 20261016T152058Z。
- 本次仅修正个人添加目标误显示批量删除按钮的问题；承接目标和自主目标均隐藏该按钮，公司级与部门级批量添加的移除操作保留。
- 使用已提交源码的独立快照，通过既有 Python 发布入口构建、备份并切换；发布前读取线上当前两份共享 Mock 数据作为随包快照，保留线上业务内容，不使用本地未提交数据。
- 34项表单回归测试、类型检查及生产构建通过；线上首页与入口资源匹配、事项直达页面、Mock 健康及两份共享数据读取核验通过。
- 前次发布为 20261016T152058Z，源码 2fb4454，包含目标复盘与月报加载优化、Mock 查询及持久化修复、任务创建与分配修复、旧字段配置及个人备忘功能清理；其回滚备份仍保留。
- 回滚使用本节备份中的 previous-target.txt 切回上一目录，再按照上文调用该发布目录的 setup.py --rollback 恢复服务、路由与共享数据。
