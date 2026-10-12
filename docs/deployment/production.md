# 静态 Mock 演示站部署

当前目标：用户确认的 https://cp.stringedu.com/sc-manager-frontend/ 。站点仅发布前端及其内置 Mock，实际 Nginx 目录为 /opt/sc-manager-frontend/dist 。历史 /manage-admin/ 是另一应用，本流程不切换其发布目录、不部署其后端、不修改数据库。

部署入口为 scripts/deploy-production.sh，Windows 可直接执行同一入口委托的 Python 脚本：

```powershell
python scripts/deploy_frontend_mock.py --project . --source-dir <已验证的独立源码快照目录> --revision <源码提交号>
```

准备命令从 stringplugin 根目录运行：

```text
python scripts/prepare_deployment.py --project <项目目录> --environment prod --config .enterprise-app-factory/config/frontend-deployment.json
```

此专用配置明确 database.mode=none，适用于已经核实的静态演示站，并保留原团队应用配置。原默认数据库预检为新生成的数据库名报不存在，不能将该数据库误当作此站点的依赖。

前置条件：Node 与现有 Vite 依赖可用，Python 已有 paramiko；凭证只从 .enterprise-app-factory/secrets/runtime.env 或环境变量加载。源码目录必须为本次已提交版本的独立快照加明确审查过的部署修复，不自动发布共享工作区里的其他未提交修改。构建强制 VITE_BASE_PATH=/sc-manager-frontend/ 和 VITE_MOCK_MODE=true。

Mock 数据编译进静态资源：数据库快照、产研模板、产品/设计/研发/测试/缺陷演示任务，以及售前8条和交付8条样例随资源上传。额外的产研演示样例每类3条，由内置管理员负责并创建，避免全新浏览器默认“我负责的”无记录；原任务归属不变。每个浏览器的编辑与新建仍保存在该浏览器，不是多人共享数据库。

流程：预检已有专属路由和 nginx -t；构建并检查资源路径及 Mock 数据；上传到 /opt/sc-manager-frontend/incoming/；解压到独立 releases/<时间戳>/；保留旧资源以支持打开中的页面；把旧站备份到 backups/<时间戳>/，切换 dist 链接；验证公共 index、JS 资源和直接业务路由。验证失败自动切回旧目录。每次产物包含 release.json，记录源码版本、模式及样例数量，不记录凭证。

回滚：在服务器上读取所选 backups/<时间戳>/previous-target.txt；首次目录切换前的旧文件位于同备份的 dist/，后续版本则指向此前 releases/。将 /opt/sc-manager-frontend/dist 原子切换到该旧目录，然后校验公共首页和业务路由。不要删除其他站点、数据库或备份。

最后成功部署：2026-10-12（北京时间13:46）。发布版本20261012T054650Z，源码abb6359加本次Mock可见性修复。

发布目录：/opt/sc-manager-frontend/releases/20261012T054650Z；备份：/opt/sc-manager-frontend/backups/20261012T054650Z。公共index与本地产物一致，入口JS及直接业务地址返回成功；全新浏览器验证产品、设计、研发、测试、缺陷默认各3条，售前和交付我负责的各6条、我创建的各4条。相关Mock测试23项通过。原数据库未写入，其他站点路由未改。
