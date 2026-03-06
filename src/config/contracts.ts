/**
 * BOBA OFT 桥接 - 各链代币与桥接应用合约地址
 */
import type { ChainKey } from './chains';

export const TOKEN_ADDRESS: Record<ChainKey, `0x${string}`> = {
  bnb: '0xE0DB679377A0F5Ae2BaE485DE475c9e1d8A4607D',
  eth: '0x42bbfa2e77757c645eeaad1655e0911a7553efbc',
};

/** 各链上的 LayerZero OFT 桥接应用合约（OFTAdapter） */
export const OFT_ADDRESS: Record<ChainKey, `0x${string}`> = {
  bnb: '0x819FF4d9215C9dAC76f5eC676b1355973157eBBa',
  eth: '0x1A36E24D61BC1aDa68C21C2Da1aD53EaB8E03e55',
};
