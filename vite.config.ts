import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const stub = path.resolve(__dirname, 'src/stub-walletconnect.ts');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/rpc/eth': {
        target: 'https://eth.llamarpc.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/rpc\/eth/, '/'),
      },
      '/rpc/bnb': {
        target: 'https://bsc-dataseed.binance.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/rpc\/bnb/, '/'),
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@reown/appkit',
      '@reown/appkit-controllers',
      '@walletconnect/ethereum-provider',
      '@walletconnect/utils',
    ],
  },
  resolve: {
    alias: {
      '@walletconnect/ethereum-provider': stub,
      '@walletconnect/utils': stub,
      '@reown/appkit': stub,
      '@reown/appkit-controllers': stub,
      '@reown/appkit-common': stub,
      '@reown/appkit-ui': stub,
      '@reown/appkit-utils': stub,
      '@reown/appkit-wallet': stub,
      '@metamask/sdk': stub,
      'socket.io-client': stub,
      'engine.io-client': stub,
    },
  },
});
