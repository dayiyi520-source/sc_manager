# Mock 演示站部署

发布目标为用户确认的 https://cp.stringedu.com/sc-manager-frontend/，前端目录为 /opt/sc-manager-frontend/dist。历史 /manage-admin/ 是另一应用，本流程不切换其目录、不部署其后端、不修改数据库。

部署入口为 scripts/deploy-production.sh。Windows 使用其委托的 Python 入口：

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

上次已核实的发布：20261013T153748Z，源码 ac83321。此次发布核验成功后更新下方记录。

## 最近成功发布

- 发布时间：2026-10-14 18:36:53（北京时间）。
- 发布编号：20261014T103653Z；发布源码：f93390a12a45e7ce8bc61050101caa8a2a54bd9d。
- 发布目录：/opt/sc-manager-frontend/releases/20261014T103653Z。
- 回滚备份：/opt/sc-manager-frontend/backups/20261014T103653Z；上一版本为 20261013T153748Z。
- 公共首页、资源及协同事项、月度目标、复盘、产品管理、产品任务、缺陷、目标总结设置直达路由通过。
- 共享 Mock 健康正常；目标保存并重新读取、旧版本写入拒绝、模板保存并重新读取通过。两份上传快照与源码一致。
- 核验时目标相关记录 13 条，O 标题模板 3 条，产研工作项模板 26 类，产品线 7 条。
- 本地相关 TypeScript 测试 59 项和 Python 文件存储测试 4 项通过，类型检查及生产构建通过。
