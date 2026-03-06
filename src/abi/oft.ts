/**
 * LayerZero OFT 接口 ABI（quoteSend / send / token / approvalRequired）
 * 参考: https://github.com/LayerZero-Labs/devtools/blob/main/packages/oft-evm/contracts/interfaces/IOFT.sol
 */
export const oftAbi = [
  {
    inputs: [],
    name: 'token',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approvalRequired',
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        internalType: 'struct SendParam',
        components: [
          { name: 'dstEid', type: 'uint32', internalType: 'uint32' },
          { name: 'to', type: 'bytes32', internalType: 'bytes32' },
          { name: 'amountLD', type: 'uint256', internalType: 'uint256' },
          { name: 'minAmountLD', type: 'uint256', internalType: 'uint256' },
          { name: 'extraOptions', type: 'bytes', internalType: 'bytes' },
          { name: 'composeMsg', type: 'bytes', internalType: 'bytes' },
          { name: 'oftCmd', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: '_payInLzToken', type: 'bool', internalType: 'bool' },
    ],
    name: 'quoteSend',
    outputs: [
      {
        name: 'msgFee',
        type: 'tuple',
        internalType: 'struct MessagingFee',
        components: [
          { name: 'nativeFee', type: 'uint256', internalType: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        internalType: 'struct SendParam',
        components: [
          { name: 'dstEid', type: 'uint32', internalType: 'uint32' },
          { name: 'to', type: 'bytes32', internalType: 'bytes32' },
          { name: 'amountLD', type: 'uint256', internalType: 'uint256' },
          { name: 'minAmountLD', type: 'uint256', internalType: 'uint256' },
          { name: 'extraOptions', type: 'bytes', internalType: 'bytes' },
          { name: 'composeMsg', type: 'bytes', internalType: 'bytes' },
          { name: 'oftCmd', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: '_fee',
        type: 'tuple',
        internalType: 'struct MessagingFee',
        components: [
          { name: 'nativeFee', type: 'uint256', internalType: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: '_refundAddress', type: 'address', internalType: 'address' },
    ],
    name: 'send',
    outputs: [
      {
        name: 'msgReceipt',
        type: 'tuple',
        internalType: 'struct MessagingReceipt',
        components: [
          { name: 'guid', type: 'bytes32', internalType: 'bytes32' },
          { name: 'nonce', type: 'uint64', internalType: 'uint64' },
          {
            name: 'fee',
            type: 'tuple',
            internalType: 'struct MessagingFee',
            components: [
              { name: 'nativeFee', type: 'uint256', internalType: 'uint256' },
              { name: 'lzTokenFee', type: 'uint256', internalType: 'uint256' },
            ],
          },
        ],
      },
      {
        name: 'oftReceipt',
        type: 'tuple',
        internalType: 'struct OFTReceipt',
        components: [
          { name: 'amountSentLD', type: 'uint256', internalType: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
