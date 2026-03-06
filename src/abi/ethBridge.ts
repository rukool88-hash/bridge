/**
 * ETH 侧桥接合约接口（Boba L1→L2 depositERC20）
 * 成功交易示例: https://etherscan.io/tx/0x56ab3682a614c6c991b29602de1c8c390772a46183816af5ed92cdea8c7735ea
 * 调用: depositERC20(_l1Token, _l2Token, _amount, _zroPaymentAddress, _adapterParams, _data)，附带 native ETH 作为跨链费
 */
export const ethBridgeAbi = [
  {
    inputs: [
      { name: '_l1Token', type: 'address', internalType: 'address' },
      { name: '_l2Token', type: 'address', internalType: 'address' },
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_zroPaymentAddress', type: 'address', internalType: 'address' },
      { name: '_adapterParams', type: 'bytes', internalType: 'bytes' },
      { name: '_data', type: 'bytes', internalType: 'bytes' },
    ],
    name: 'depositERC20',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
