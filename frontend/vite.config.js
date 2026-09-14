import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');


  const processEnv = {};
  for (const key in env) {
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'REACT_APP_'],
    server: {
      port: 3000,
      open: true,
    },
    define: processEnv,
  };
});
