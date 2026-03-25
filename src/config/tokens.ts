import type { ChainKey } from './chains';
import type { Address } from 'viem';

/** 桥接协议类型 */
export type BridgeProtocol = 'bobaCustom' | 'lzV1OFT' | 'lzV2OFT' | 'zcxCustom' | 'maivNtt';

export type ChainTokenConfig = {
  tokenAddress: Address;
  bridgeAddress: Address;
  /** 发送方向上附带的 native 费估算（用于无链上 quote 的 bobaCustom） */
  defaultFeeEstimate?: bigint;
  /**
   * zcxCustom 专用：OFT 代理合约地址（用于 estimateSendFee）
   * 桥接合约 bridgeAddress 内部调用此代理完成跨链
   */
  oftProxy?: Address;
};

export type TokenConfig = {
  symbol: string;
  name: string;
  protocol: BridgeProtocol;
  /** 支持的链对，顺序即 UI 默认选项 */
  chainPairs: [ChainKey, ChainKey][];
  chains: Partial<Record<ChainKey, ChainTokenConfig>>;
};

export const TOKENS: Record<string, TokenConfig> = {
  BOBA: {
    symbol: 'BOBA',
    name: 'Boba Token',
    protocol: 'bobaCustom',
    chainPairs: [['bnb', 'eth']],
    chains: {
      bnb: {
        tokenAddress: '0xE0DB679377A0F5Ae2BaE485DE475c9e1d8A4607D',
        bridgeAddress: '0x819FF4d9215C9dAC76f5eC676b1355973157eBBa',
        defaultFeeEstimate: 5000000000000000n, // ~0.005 BNB
      },
      eth: {
        tokenAddress: '0x42bbfa2e77757c645eeaad1655e0911a7553efbc',
        bridgeAddress: '0x1A36E24D61BC1aDa68C21C2Da1aD53EaB8E03e55',
        defaultFeeEstimate: 1000000000000000n, // ~0.001 ETH
      },
    },
  },

  wUSDR: {
    symbol: 'wUSDR',
    name: 'Wrapped USDR',
    protocol: 'lzV1OFT',
    // 支持 Polygon ↔ BASE 与 Optimism ↔ BASE
    chainPairs: [
      ['polygon', 'base'],
      ['op', 'base'],
    ],
    chains: {
      polygon: {
        tokenAddress: '0x00e8c0e92eb3ad88189e7125ec8825edc03ab265',
        bridgeAddress: '0x00e8c0E92eB3Ad88189E7125Ec8825eDc03Ab265',
      },
      op: {
        tokenAddress: '0xC03b43d492d904406db2d7D57e67C7e8234bA752',
        bridgeAddress: '0xC03b43d492d904406db2d7D57e67C7e8234bA752',
      },
      base: {
        tokenAddress: '0x9483ab65847a447e36d21af1cab8c87e9712ff93',
        bridgeAddress: '0x9483ab65847A447e36d21af1CaB8C87e9712ff93',
      },
    },
  },

  MAIV: {
    symbol: 'MAIV',
    name: 'Maiv Token',
    /**
     * 新协议：MAIV NTT 桥接（非 LayerZero）
     *
     * - ETH 侧：调用桥接合约 0x3738... 的 transfer(amount, recipientChain, recipient, refundAddress, shouldQueue, transceiverInstructions)
     *   方法 ID: 0xb293f97f
     *   示例 tx: https://etherscan.io/tx/0x29d926660c35132d5f5d21d94fc5eb3d2da80dfa6ae73289889dafebdd274a37
     *   关键参数:
     *     - recipientChain: 30 (协议内部 Base 链 ID)
     *     - recipient / refundAddress: 用户地址 bytes32 右对齐
     *     - shouldQueue: true
     *     - transceiverInstructions: 0x01000101（常量）
     *
     * - Base 侧：同样直接调用 0x3738... 的 transfer(uint256,uint16,bytes32,bytes32,bool,bytes)
     *   示例 tx: https://basescan.org/tx/0x3beb9dd2759fdb972737023495445e787fff9ea4dd524b5e696a38983eda194c
     *   其中 recipientChain=2（内部 Ethereum 链 ID），recipient/refundAddress 为用户地址，shouldQueue=false，
     *   transceiverInstructions 同样为 0x01000101。
     */
    protocol: 'maivNtt',
    // 支持 ETH ↔ BASE 双向（内部链 ID：ETH=2，BASE=30）
    chainPairs: [['eth', 'base']],
    chains: {
      eth: {
        tokenAddress: '0x39903a1A6f289A67E0DE94096915c4ccD506Ab2a',
        bridgeAddress: '0x373821335A7FF64d9768AeDa7C47a25dB7AC0221',
      },
      base: {
        tokenAddress: '0x4b82AC0D1531290E3eDb3Abe9a985623Bf7EDAEE',
        bridgeAddress: '0x373821335A7FF64d9768AeDa7C47a25dB7AC0221',
      },
    },
  },

  BRZ: {
    symbol: 'BRZ',
    name: 'Brazilian Digital',
    /**
     * MAIV NTT 协议代币：BRZ
     *
     * 桥接合约（3 链共用）：0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f
     *
     * Polygon → Base 示例：
     *   tx: https://polygonscan.com/tx/0x1598621092a18a500f5e02105e4177be2bb777c5e33f0589fef5e0777fc733c6
     *   recipientChain = 30（Base 内部 ID），shouldQueue = false，instr = 0x01000101
     *
     * Base → Polygon 示例：
     *   tx: https://basescan.org/tx/0x9a6382ea0e8766f752b0dc5695d8436393b354aae69b7e5700c776ebffddb7c0
     *   recipientChain = 5（Polygon 内部 ID），shouldQueue = false，instr = 0x01000101
     *
     * Polygon → Avalanche 示例：
     *   tx: https://polygonscan.com/tx/0xe0b7180d971cd1dfb5a18505e07a8541ff761484132e36b2bfef16b6a89be53a
     *   recipientChain = 6（Avalanche 内部 ID），shouldQueue = false，instr = 0x01000100
     *
     * Avalanche → Base 示例：
     *   tx: https://basescan.org/tx/0xdadcf64a4efd68cb132754c340e83b4d3d2c8129eac567beeacf84f472d548bc
     *   recipientChain = 6（Avalanche 内部 ID），shouldQueue = false，instr = 0x01000101
     */
    protocol: 'maivNtt',
    // 支持 Polygon / Base / Avalanche 三链之间互相跨（通过内部链 ID 映射）
    chainPairs: [
      ['polygon', 'base'],
      ['polygon', 'avax'],
      ['base', 'avax'],
    ],
    chains: {
      polygon: {
        tokenAddress: '0x4eD141110F6EeeAbA9A1df36d8c26f684d2475Dc',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
      base: {
        tokenAddress: '0xE9185Ee218cae427aF7B9764A011bb89FeA761B4',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
      avax: {
        tokenAddress: '0x05539F021b66Fd01d1FB1ff8E167CdD09bf7c2D0',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
    },
  },

  BRZ0: {
    symbol: 'BRZ0',
    name: 'BRZ (POLY ↔ BASE)',
    protocol: 'maivNtt',
    chainPairs: [['polygon', 'base']],
    chains: {
      polygon: {
        tokenAddress: '0x4eD141110F6EeeAbA9A1df36d8c26f684d2475Dc',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
      base: {
        tokenAddress: '0xE9185Ee218cae427aF7B9764A011bb89FeA761B4',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
    },
  },

  BRZ1: {
    symbol: 'BRZ1',
    name: 'BRZ (POLY ↔ AVAX)',
    protocol: 'maivNtt',
    chainPairs: [['polygon', 'avax']],
    chains: {
      polygon: {
        tokenAddress: '0x4eD141110F6EeeAbA9A1df36d8c26f684d2475Dc',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
      avax: {
        tokenAddress: '0x05539F021b66Fd01d1FB1ff8E167CdD09bf7c2D0',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
    },
  },

  BRZ2: {
    symbol: 'BRZ2',
    name: 'BRZ (AVAX ↔ BASE)',
    protocol: 'maivNtt',
    chainPairs: [['avax', 'base']],
    chains: {
      avax: {
        tokenAddress: '0x05539F021b66Fd01d1FB1ff8E167CdD09bf7c2D0',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
      base: {
        tokenAddress: '0xE9185Ee218cae427aF7B9764A011bb89FeA761B4',
        bridgeAddress: '0x8469783eDd405210a5438a4568eA4D0dbcC9CF7f',
      },
    },
  },

  L3: {
    symbol: 'L3',
    name: 'Layer3 (L3 Token)',
    protocol: 'maivNtt',
    chainPairs: [['bnb', 'eth']],
    chains: {
      bnb: {
        tokenAddress: '0x46777C76dBbE40fABB2AAB99E33CE20058e76C59',
        bridgeAddress: '0xBC51f76178a56811fdfe95D3897E6aC2B11DbB62',
      },
      eth: {
        tokenAddress: '0x88909D489678dD17aA6D9609F89B0419Bf78FD9a',
        bridgeAddress: '0x7926D63FEb9b950908b297cC995B6853bCA21847',
      },
    },
  },

  ZCX: {
    symbol: 'ZCX',
    name: 'ZCX Token',
    /**
     * Unizen 自定义桥接协议（非标准 LZ OFT）
     * 实际调用桥接合约 0xef58B643...，内部路由到 OFT 代理合约
     * 参考:
     *   Polygon tx: https://polygonscan.com/tx/0xb40f44aaf3f06e7680d346fdac1c577feaa3ae790809b8c0f979b257cb4345ec
     *   ETH tx:     https://etherscan.io/tx/0x587345a9bb4e558a6d9b4e98f89ad4b768c9e207d91473c2067cb6fc1045541f
     */
    protocol: 'zcxCustom',
    chainPairs: [['polygon', 'eth']],
    chains: {
      polygon: {
        tokenAddress: '0xdd75542611d57c4b6e68168b14c3591c539022ed',
        bridgeAddress: '0xef58B643240178c2BC37681f8d4E50d7Ec37Ee22',
        // OFT 代理：用于 estimateSendFee（实际 tx 约 23 POL）
        oftProxy: '0x8b2D2a18e7656633F087c60D067750CAD815ab9a',
        defaultFeeEstimate: 25000000000000000000n, // 25 POL 后备估算
      },
      eth: {
        tokenAddress: '0xc52c326331e9ce41f04484d3b5e5648158028804',
        bridgeAddress: '0xef58B643240178c2BC37681f8d4E50d7Ec37Ee22',
        // OFT 代理：用于 estimateSendFee（实际 tx 约 0.00045 ETH）
        oftProxy: '0xf185ec2541ED55aCdff11866F60c46F52e06660C',
        defaultFeeEstimate: 1000000000000000n, // 0.001 ETH 后备估算
      },
    },
  },
  SHRAP: {
    symbol: 'SHRAP',
    name: 'Shrapnel Token',
    /**
     * LayerZero V1 OFT（代币合约即桥接合约，同 wUSDR）
     * 无需 OFT 代理；两链同一合约地址
     * 参考:
     *   BNB tx: https://bscscan.com/tx/0x8e7fd92e9c16b5621932d7ce4d219968581e44e5310f51d833f7526f5c82bcde
     *   ETH tx: https://etherscan.io/tx/0xd4584660f232a55c47d4f98d7427df196aac3fad8ac1a4aad5867143c509205b
     * adapterParams: 0x000100...03D090 (gasLimit=250000)
     */
    protocol: 'lzV1OFT',
    chainPairs: [['eth', 'bnb']],
    chains: {
      bnb: {
        tokenAddress: '0x31e4efe290973ebE91b3a875a7994f650942D28F',
        bridgeAddress: '0x31e4efe290973ebE91b3a875a7994f650942D28F',
        defaultFeeEstimate: 4000000000000000n, // ~0.004 BNB 后备（实测约 0.004 BNB）
      },
      eth: {
        tokenAddress: '0x31e4efe290973ebE91b3a875a7994f650942D28F',
        bridgeAddress: '0x31e4efe290973ebE91b3a875a7994f650942D28F',
        defaultFeeEstimate: 600000000000000n, // ~0.0006 ETH 后备（实测约 0.0005 ETH）
      },
    },
  },

  OPN: {
    symbol: 'OPN',
    name: 'Opinion Token',
    /**
     * LayerZero V2 原生 OFT（token 合约即 OFT，无需 approve）
     * 两链使用完全相同的合约地址，burn/mint 模式
     * 参考:
     *   BNB tx: https://bscscan.com/tx/0x94a91bac1d910b6860061ebd0391061674728ceae43fa8d8cdba0e919919b929
     *   ETH tx: https://etherscan.io/tx/0x28e0d4aaa5f726ace7f5b85cb152afd28674c9f8553978d73a57f12b5dd3d4d4
     * extraOptions: 0x00030100110100000000000000000000000000035b60 (gasLimit=220000)
     */
    protocol: 'lzV2OFT',
    chainPairs: [['bnb', 'eth']],
    chains: {
      bnb: {
        tokenAddress: '0x7977BF3e7e0c954D12cdcA3E013ADAf57E0B06E0',
        bridgeAddress: '0x7977BF3e7e0c954D12cdcA3E013ADAf57E0B06E0',
        defaultFeeEstimate: 2000000000000000n, // 0.002 BNB 后备估算（实测约 0.00108 BNB）
      },
      eth: {
        tokenAddress: '0x7977BF3e7e0c954D12cdcA3E013ADAf57E0B06E0',
        bridgeAddress: '0x7977BF3e7e0c954D12cdcA3E013ADAf57E0B06E0',
        defaultFeeEstimate: 100000000000000n,  // 0.0001 ETH 后备估算（实测约 0.00004 ETH）
      },
    },
  },

  DMTR: {
    symbol: 'DMTR',
    name: 'Dimitra Token',
    /**
     * Unizen 自定义桥接协议（同 ZCX，zcxCustom）
     * 与 ZCX 共用相同桥接合约和 OFT 代理，仅代币地址不同
     * 参考:
     *   Polygon tx: https://polygonscan.com/tx/0x344a38942883e3d49f8b1b2ff46ffd1dd9ce66e2f81a0b4c564cc95b8f2b4420
     *   ETH tx:     https://etherscan.io/tx/0xd0b2b69eea167ed0e1164782dba6671fc07822a0de737c35ce29229d07f71bea
     */
    protocol: 'zcxCustom',
    chainPairs: [['polygon', 'eth']],
    chains: {
      polygon: {
        tokenAddress: '0xc0050638D1E7233054e7Fdf6baEf846e92E2579a',
        bridgeAddress: '0xef58B643240178c2BC37681f8d4E50d7Ec37Ee22',
        oftProxy: '0x8b2D2a18e7656633F087c60D067750CAD815ab9a',
        defaultFeeEstimate: 25000000000000000000n, // 25 POL 后备估算（实际约 22 POL）
      },
      eth: {
        tokenAddress: '0x51cB253744189f11241becb29BeDd3F1b5384fdB',
        bridgeAddress: '0xef58B643240178c2BC37681f8d4E50d7Ec37Ee22',
        oftProxy: '0xf185ec2541ED55aCdff11866F60c46F52e06660C',
        defaultFeeEstimate: 1000000000000000n, // 0.001 ETH 后备估算（实际约 0.00045 ETH）
      },
    },
  },

  bZCX: {
    symbol: 'bZCX',
    name: 'bZCX Token (BNB)',
    /**
     * Unizen 自定义桥接协议（同 ZCX，zcxCustom）
     * bZCX 是 ZCX 在 BNB 链上的映射代币；ETH 侧复用 ZCX 的桥接合约和 OFT 代理
     * 参考:
     *   BNB tx: https://bscscan.com/tx/0x1bb4dca78e48a7d11195f90b3ce72494036aa592ed7595825d64d0eff770a7a4
     *   ETH tx: https://etherscan.io/tx/0xdf4e226043bd89ac140250341f89ac194d21585b381d9ec59319bac875a5d946
     */
    protocol: 'zcxCustom',
    chainPairs: [['bnb', 'eth']],
    chains: {
      bnb: {
        tokenAddress: '0x0Fdc787480BCaBD51Cc61c698a4220934920b831',
        bridgeAddress: '0x42479c390270cBa049A2D10F63bF75d9D0B7a742',
        // BNB 侧专属 OFT 代理（实际 tx 约 0.0037 BNB）
        oftProxy: '0xec7aE53D4569d37e1281f3db5ed6b0224611E08C',
        defaultFeeEstimate: 5000000000000000n, // 0.005 BNB 后备估算
      },
      eth: {
        // ETH 侧使用 ZCX 相同的代币、桥接合约和 OFT 代理
        tokenAddress: '0xC52C326331E9Ce41F04484d3B5E5648158028804',
        bridgeAddress: '0xef58B643240178c2BC37681f8d4E50d7Ec37Ee22',
        oftProxy: '0xf185ec2541ED55aCdff11866F60c46F52e06660C',
        defaultFeeEstimate: 1000000000000000n, // 0.001 ETH 后备估算（实际约 0.00046 ETH）
      },
    },
  },
};

export type TokenKey = keyof typeof TOKENS;
