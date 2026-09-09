import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';

function devApiMockPlugin() {
  return {
    name: 'dev-api-mock',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';

        if (!url.startsWith('/api')) {
          return next();
        }

        // 1. Mock /api/auth/dev-login
        if (process.env.VITE_USE_MOCK_AUTH === 'true' && url.startsWith('/api/auth/dev-login') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const { username } = JSON.parse(body || '{}');
              const localUsers: Record<string, any> = {
                admin: { id: 'user-admin', name: '林志豪', avatar: '', role: 'admin', roleTitle: '超级系统管理员', department: '平台架构部' },
                sales: { id: 'user-sales', name: '陈雅婷', avatar: '', role: 'sales_director', roleTitle: '销售总监', department: '商务大客户部' },
                product: { id: 'user-product', name: '张瑞', avatar: '', role: 'product_manager', roleTitle: '产品经理', department: '产品中心' },
                tech: { id: 'user-tech', name: '王浩然', avatar: '', role: 'tech_lead', roleTitle: '技术负责人', department: '研发一组' }
              };
              const user = localUsers[username] || localUsers.admin;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                code: 'SUCCESS',
                message: '开发环境登录成功',
                data: {
                  token: `dev-token-${username || 'admin'}`,
                  expiresIn: 28800,
                  user
                },
                requestId: 'dev-mock-login'
              }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 'BAD_REQUEST', message: '请求格式错误', data: null }));
            }
          });
          return;
        }

        // 2. Mock /api/auth/dev-accounts
        if (process.env.VITE_USE_MOCK_AUTH === 'true' && url.startsWith('/api/auth/dev-accounts')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            code: 'SUCCESS',
            message: '获取成功',
            data: [
              { id: 'emp-001', name: '林志豪', department: '平台架构部', avatar: '' },
              { id: 'emp-002', name: '陈雅婷', department: '商务大客户部', avatar: '' },
              { id: 'emp-003', name: '张瑞', department: '产品中心', avatar: '' },
              { id: 'emp-004', name: '王浩然', department: '研发一组', avatar: '' }
            ],
            requestId: 'dev-mock-accounts'
          }));
          return;
        }

        // 3. Mock /api/requirements/departments
        if (process.env.VITE_USE_MOCK_AUTH === 'true' && url.startsWith('/api/requirements/departments')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            code: 'SUCCESS',
            message: '获取成功',
            data: [
              { id: 'dept-01', name: '平台架构部', code: 'ARCH' },
              { id: 'dept-02', name: '产品中心', code: 'PROD' },
              { id: 'dept-03', name: '研发一组', code: 'DEV1' },
              { id: 'dept-04', name: '商务大客户部', code: 'SALES' }
            ],
            requestId: 'dev-mock-departments'
          }));
          return;
        }

        // 其余接口交给 Vite proxy 转发到本地 Spring Boot；后端不可用时由
        // proxy error handler 返回 503，避免后端启动后仍被前端 Mock 拦截。
        return next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [devApiMockPlugin(), react(), tailwindcss()],
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            charts: ['recharts'],
            motion: ['motion', 'gsap'],
            icons: ['lucide-react', '@primer/octicons-react']
          }
        }
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    code: 'SERVICE_UNAVAILABLE',
                    message: '后端服务未启动',
                    data: null,
                    requestId: 'offline-fallback',
                  })
                );
              }
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
