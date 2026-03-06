/**
 * BNB 侧桥接合约接口（Boba L2→L1 withdraw）
 * 成功交易示例: https://bscscan.com/tx/0x3a32a19f4be9e6e0ec35847f35fe150ae090b92f1ac24ccb5577a735ea16ecbf
 * 调用: withdraw(_l2Token, _amount, _zroPaymentAddress, _adapterParams, _data)，并附带 native 作为跨链费
 */
export const bnbBridgeAbi = [
  {
    inputs: [
      { name: '_l2Token', type: 'address', internalType: 'address' },
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_zroPaymentAddress', type: 'address', internalType: 'address' },
      { name: '_adapterParams', type: 'bytes', internalType: 'bytes' },
      { name: '_data', type: 'bytes', internalType: 'bytes' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
