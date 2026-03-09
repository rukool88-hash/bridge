/**
 * 跨链桥支持的链配置
 * BOBA:  BNB Chain ↔ Ethereum（Boba 自定义桥）
 * wUSDR: Polygon ↔ BASE（LayerZero V1 OFT）
 */
export const CHAINS = {
  bnb: {
    chainId: 56,
    name: 'BNB Chain',
    nativeSymbol: 'BNB',
    eid: 30102 as const,       // LayerZero V2 EID（BOBA 用）
    lzV1ChainId: 102 as const, // LayerZero V1 chain ID（wUSDR 不用）
    rpcUrl: 'https://bsc.publicnode.com',
    blockExplorer: 'https://bscscan.com',
  },
  eth: {
    chainId: 1,
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    eid: 30101 as const,
    lzV1ChainId: 101 as const,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU',
    blockExplorer: 'https://etherscan.io',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    nativeSymbol: 'POL',
    eid: 30109 as const,
    lzV1ChainId: 109 as const, // LayerZero V1 Polygon chain ID
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU',
    blockExplorer: 'https://polygonscan.com',
  },
  op: {
    chainId: 10,
    name: 'Optimism',
    nativeSymbol: 'ETH',
    // 当前项目中未使用 LZ V2，EID 预留为 0
    eid: 0 as const,
    lzV1ChainId: 111 as const, // LayerZero V1 Optimism chain ID
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU',
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  base: {
    chainId: 8453,
    name: 'BASE',
    nativeSymbol: 'ETH',
    eid: 30184 as const,
    lzV1ChainId: 184 as const, // LayerZero V1 BASE chain ID
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU',
    blockExplorer: 'https://basescan.org',
  },
  avax: {
    chainId: 43114,
    name: 'Avalanche',
    nativeSymbol: 'AVAX',
    // 当前项目中未使用 LZ V2，EID 暂置为 0
    eid: 0 as const,
    // Avalanche 的 LayerZero V1 chain ID，当前未使用，仅预留
    lzV1ChainId: 106 as const,
    rpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU',
    blockExplorer: 'https://snowtrace.io',
  },
} as const;

export type ChainKey = keyof typeof CHAINS;
