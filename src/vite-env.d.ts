/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BNB_RPC?: string;
  readonly VITE_ETH_RPC?: string;
  readonly VITE_RPC_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
