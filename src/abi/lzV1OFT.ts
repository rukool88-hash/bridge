/**
 * LayerZero V1 OFTT 接口 ABI（sendFrom / estimateSendFee）
 * 用于 wUSDR 在 Polygon ↔ BASE 之间桥接
 * 参考:
 *   Polygon tx: https://polygonscan.com/tx/0x5715247eb8a09bc179bbeae3d88883368a25e8ecf91f8751b42e15b5dfcdb3e1
 *   BASE tx:    https://basescan.org/tx/0x181d62d794d88b93afbeb51cceee96ca0b762944231bb76e52484d9770415d80
 *
 * 注意：_dstChainId 是 LayerZero V1 链 ID（非 EVM chainId）
 *       _toAddress 是 abi.encodePacked(address)（20 字节，无填充）
 */
export const lzV1OFTAbi = [
  {
    inputs: [
      { name: '_dstChainId', type: 'uint16', internalType: 'uint16' },
      { name: '_toAddress', type: 'bytes', internalType: 'bytes' },
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_useZro', type: 'bool', internalType: 'bool' },
      { name: '_adapterParams', type: 'bytes', internalType: 'bytes' },
    ],
    name: 'estimateSendFee',
    outputs: [
      { name: 'nativeFee', type: 'uint256', internalType: 'uint256' },
      { name: 'zroFee', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_from', type: 'address', internalType: 'address' },
      { name: '_dstChainId', type: 'uint16', internalType: 'uint16' },
      { name: '_toAddress', type: 'bytes', internalType: 'bytes' },
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_refundAddress', type: 'address', internalType: 'address' },
      { name: '_zroPaymentAddress', type: 'address', internalType: 'address' },
      { name: '_adapterParams', type: 'bytes', internalType: 'bytes' },
    ],
    name: 'sendFrom',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
