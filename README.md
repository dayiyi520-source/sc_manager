# 师创管理后台

React/Vite 管理后台，首期提供本地开发账号和 CRM 数据闭环。

## UI 设计基线

前端界面统一遵循 [AIEDIT UI 设计规范](docs/AIEDIT_UI_DESIGN_SPECIFICATION.md)：采用克制的深色生产力工作台、规范化设计 Token、蓝色主操作和语义状态色。新增或调整页面时，先复用该规范中的颜色、字体、间距、圆角、组件状态和响应式规则；禁止引入大面积装饰性渐变、嵌套卡片或伪造可点击控件。

## 本地启动

前置：Docker Desktop、Bun 1.2+。

1. 可选：将 `.env.example` 复制为 `.env.local` 并按需修改本地数据库密码；不要提交该文件。
2. 在项目根目录执行 `docker compose --env-file .env.local -f docker-compose.local.yml up --build`（没有 `.env.local` 时可省略 `--env-file`）。
3. 在 `frontend` 执行 `bun install`。
4. 在 `frontend` 执行 `bun run dev`，打开 `http://127.0.0.1:3000`。

默认开发账号为 `admin`、`sales`、`product`、`tech`。本地数据库凭据只用于开发，不可用于生产。

## 前后端同步开发约定

凡前端功能依赖后端接口，必须同步交付对应的后端 Controller、Service、Mapper、数据库迁移（如涉及数据结构）和接口测试；前端调用、后端实现和数据库状态需在同一轮自测中完成验证。仅有前端回退数据只用于服务不可用时的本地验收，不视为后端功能已交付。
