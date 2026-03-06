/**
 * 自定义代币管理（存储于 localStorage）
 * - bigint 字段序列化为字符串存储
 * - 提供 useAllTokens hook，合并内置代币与自定义代币，并响应变更
 */
import { useState, useEffect } from 'react';
import { TOKENS, type TokenConfig, type BridgeProtocol } from './tokens';
import type { ChainKey } from './chains';

const STORAGE_KEY = 'bridge_custom_tokens_v1';
const CHANGE_EVENT = 'bridge_tokens_changed';

// 序列化格式（bigint → string）
type SerializedChain = {
  tokenAddress: string;
  bridgeAddress: string;
  oftProxy?: string;
  defaultFeeEstimate?: string;
};
type SerializedToken = {
  symbol: string;
  name: string;
  protocol: BridgeProtocol;
  chainPairs: [string, string][];
  chains: Record<string, SerializedChain>;
};

function deserialize(raw: Record<string, SerializedToken>): Record<string, TokenConfig> {
  const result: Record<string, TokenConfig> = {};
  for (const [key, cfg] of Object.entries(raw)) {
    const chains: TokenConfig['chains'] = {};
    for (const [ck, cc] of Object.entries(cfg.chains)) {
      (chains as any)[ck] = {
        tokenAddress: cc.tokenAddress,
        bridgeAddress: cc.bridgeAddress,
        ...(cc.oftProxy ? { oftProxy: cc.oftProxy } : {}),
        ...(cc.defaultFeeEstimate != null ? { defaultFeeEstimate: BigInt(cc.defaultFeeEstimate) } : {}),
      };
    }
    result[key] = {
      symbol: cfg.symbol,
      name: cfg.name,
      protocol: cfg.protocol,
      chainPairs: cfg.chainPairs as [ChainKey, ChainKey][],
      chains,
    };
  }
  return result;
}

function serialize(cfg: TokenConfig): SerializedToken {
  const chains: Record<string, SerializedChain> = {};
  for (const [ck, cc] of Object.entries(cfg.chains)) {
    if (!cc) continue;
    chains[ck] = {
      tokenAddress: cc.tokenAddress,
      bridgeAddress: cc.bridgeAddress,
      ...(cc.oftProxy ? { oftProxy: cc.oftProxy } : {}),
      ...(cc.defaultFeeEstimate != null ? { defaultFeeEstimate: cc.defaultFeeEstimate.toString() } : {}),
    };
  }
  return {
    symbol: cfg.symbol,
    name: cfg.name,
    protocol: cfg.protocol,
    chainPairs: cfg.chainPairs as [string, string][],
    chains,
  };
}

export function getCustomTokens(): Record<string, TokenConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return deserialize(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function getAllTokens(): Record<string, TokenConfig> {
  return { ...TOKENS, ...getCustomTokens() };
}

export function saveCustomToken(key: string, config: TokenConfig): void {
  try {
    const existing: Record<string, SerializedToken> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    existing[key] = serialize(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (e) {
    console.error('保存自定义代币失败:', e);
  }
}

export function deleteCustomToken(key: string): void {
  try {
    const existing: Record<string, SerializedToken> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete existing[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function isBuiltinToken(key: string): boolean {
  return key in TOKENS;
}

/** 合并内置 + 自定义代币，监听变更自动更新 */
export function useAllTokens(): Record<string, TokenConfig> {
  const [tokens, setTokens] = useState(getAllTokens);
  useEffect(() => {
    const update = () => setTokens(getAllTokens());
    window.addEventListener(CHANGE_EVENT, update);
    return () => window.removeEventListener(CHANGE_EVENT, update);
  }, []);
  return tokens;
}
