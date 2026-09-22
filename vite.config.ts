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
                admin: { id: 'user-admin', name: '林志豪', avatar: '', role: 'admin', roleTitle: '超级系统管理员', department: '软件研发部' }
              };
              const user = localUsers[username];
              if (!user) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ code: 'VALIDATION_ERROR', message: '登录账号不存在', data: null, requestId: 'dev-mock-login' }));
                return;
              }
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
              { id: 'user-admin', name: '林志豪', department: '软件研发部', avatar: '' }
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
              { id: 'dept-01', name: '专家顾问部', code: 'CONSULT' },
              { id: 'dept-02', name: '市场运营部', code: 'MARKET' },
              { id: 'dept-03', name: '售前方案部', code: 'PRESALES' },
              { id: 'dept-04', name: '产品规划部', code: 'PRODUCT' },
              { id: 'dept-05', name: '项目管理交付中心', code: 'PMO' },
              { id: 'dept-06', name: '师生服务交付中心', code: 'SERVICE' },
              { id: 'dept-07', name: '数据应用部', code: 'DATA' },
              { id: 'dept-08', name: '软件研发部', code: 'DEV' },
              { id: 'dept-09', name: '交互设计部', code: 'DESIGN' },
              { id: 'dept-10', name: '人力行政部', code: 'HR' }
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
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      // After stable vendor and application-context splitting, the largest
      // verified chunk is below this threshold (and does not form a cycle).
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const moduleId = id.replace(/\\/g, '/');

            if (!moduleId.includes('/node_modules/')) return;
            if (moduleId.includes('/node_modules/react/') || moduleId.includes('/node_modules/react-dom/') || moduleId.includes('/node_modules/react-router')) return 'react';
            if (moduleId.includes('/node_modules/@tanstack/')) return 'query';
            if (moduleId.includes('/node_modules/recharts/')) return 'charts';
            if (moduleId.includes('/node_modules/@tinymce/') || moduleId.includes('/node_modules/tinymce/')) return 'rich-editor';
            if (moduleId.includes('/node_modules/marked/')) return 'markdown';
            if (moduleId.includes('/node_modules/motion/') || moduleId.includes('/node_modules/gsap/')) return 'motion';
            if (moduleId.includes('/src/context/AppContext')) return 'app-context';
            if (moduleId.includes('/src/components/common/octicons-compat')) return 'octicons';
          }
        }
      }
    },
    server: {
      port: 3010,
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8081',
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
