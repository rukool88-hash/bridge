import { useState, useEffect } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useSwitchChain,
  usePublicClient,
} from 'wagmi';
import {
  parseUnits, formatUnits, encodePacked, encodeAbiParameters,
  createPublicClient, http, type Address,
} from 'viem';
import { bsc, mainnet, polygon, base } from 'wagmi/chains';
import { CHAINS, type ChainKey } from '../config/chains';
import { type TokenKey } from '../config/tokens';
import { useAllTokens } from '../config/customTokens';
import { erc20Abi } from '../abi/erc20';
import { bnbBridgeAbi } from '../abi/bnbBridge';
import { ethBridgeAbi } from '../abi/ethBridge';
import { lzV1OFTAbi } from '../abi/lzV1OFT';
import { oftAbi } from '../abi/oft';

const CHAIN_ID_TO_VIEM: Record<number, typeof bsc> = {
  56: bsc, 1: mainnet, 137: polygon, 8453: base,
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

/** address → 20 字节 packed bytes（LZ V1 _toAddress 格式） */
function addressToPackedBytes(addr: Address): `0x${string}` {
  return encodePacked(['address'], [addr]);
}

/** address → bytes32 右对齐（LZ V2 sendParam.to 格式） */
function addressToBytes32(addr: Address): `0x${string}` {
  return `0x000000000000000000000000${addr.slice(2).toLowerCase()}` as `0x${string}`;
}

/**
 * LZ V2 OFT extraOptions：version3 + executor LZ_RECEIVE gasLimit=220000
 * 与成功交易完全一致（BNB和ETH两笔tx的extraOptions均为此值）
 */
const LZ_V2_EXTRA_OPTIONS = '0x00030100110100000000000000000000000000035b60' as `0x${string}`;

/**
 * 编码 ZCX Unizen 桥接调用数据（方法 ID 0xd041024c）
 *
 * 外层结构：tuple(address oftProxy, bytes4 innerSelector, bytes innerCallData)
 * innerCallData：abi.encode(address from, uint256 dstEvmChainId, uint256 dstLzChainId,
 *                           address srcToken, uint256 amount, bytes adapterParams)
 *
 * adapterParams：LZ V1 版本1 + gasLimit 1,200,000（与成功交易完全一致）
 */
const ZCX_BRIDGE_SELECTOR = '0xd041024c';
const ZCX_OFT_SELECTOR = '0x2243eb25' as `0x${string}`;
const ZCX_ADAPTER_PARAMS = '0x00010000000000000000000000000000000000000000000000000000000000124f80' as `0x${string}`;

function encodeZCXBridgeData(params: {
  oftProxy: Address;
  from: Address;
  dstEvmChainId: bigint;
  dstLzChainId: bigint;
  srcToken: Address;
  amount: bigint;
}): `0x${string}` {
  const { oftProxy, from, dstEvmChainId, dstLzChainId, srcToken, amount } = params;

  const innerCallData = encodeAbiParameters(
    [
      { type: 'address' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'address' }, { type: 'uint256' }, { type: 'bytes' },
    ],
    [from, dstEvmChainId, dstLzChainId, srcToken, amount, ZCX_ADAPTER_PARAMS],
  );

  const tupleEncoded = encodeAbiParameters(
    [{
      type: 'tuple',
      components: [
        { name: 'oftProxy', type: 'address' },
        { name: 'selector', type: 'bytes4' },
        { name: 'callData', type: 'bytes' },
      ],
    }],
    [{ oftProxy, selector: ZCX_OFT_SELECTOR, callData: innerCallData }],
  );

  return `${ZCX_BRIDGE_SELECTOR}${tupleEncoded.slice(2)}` as `0x${string}`;
}

export function BridgeForm() {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();

  const allTokens = useAllTokens();
  const [tokenKey, setTokenKey] = useState<TokenKey>('BOBA');
  const tokenCfg = allTokens[tokenKey] ?? allTokens['BOBA'];

  const [fromChain, setFromChain] = useState<ChainKey>(tokenCfg.chainPairs[0][0]);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const [quoteNative, setQuoteNative] = useState<bigint | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setQuoteNative(null); setQuoteError(null); setTxHash(null); setSendError(null);
  }, [fromChain]);

  // 若 fromChain 不属于当前代币则回退（防止代币切换时的帧不一致崩溃）
  const safeFromChain: ChainKey = tokenCfg.chains[fromChain]
    ? fromChain : tokenCfg.chainPairs[0][0];

  const currentPair = tokenCfg.chainPairs.find(([a, b]) => a === safeFromChain || b === safeFromChain);
  const toChain: ChainKey = currentPair
    ? (currentPair[0] === safeFromChain ? currentPair[1] : currentPair[0])
    : tokenCfg.chainPairs[0][1];

  const fromChainCfg = CHAINS[safeFromChain];
  const toChainCfg   = CHAINS[toChain];
  const fromTokenCfg = tokenCfg.chains[safeFromChain]!;
  const toTokenCfg   = tokenCfg.chains[toChain]!;

  const isCorrectChain = (chain?.id ?? fromChainCfg.chainId) === fromChainCfg.chainId;

  useEffect(() => {
    if (safeFromChain !== fromChain) setFromChain(safeFromChain);
  }, [safeFromChain, fromChain]);

  const { data: decimals } = useReadContract({
    address: fromTokenCfg.tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId: fromChainCfg.chainId,
  });

  const { data: balance } = useBalance({
    address: address ?? undefined,
    token: fromTokenCfg.tokenAddress,
    chainId: fromChainCfg.chainId,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: fromTokenCfg.tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, fromTokenCfg.bridgeAddress] : undefined,
    chainId: fromChainCfg.chainId,
  });

  const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: sendContractAsync, isPending: isSendContractPending } = useWriteContract();
  const { sendTransactionAsync, isPending: isSendTxPending } = useSendTransaction();
  const isSendPending = isSendContractPending || isSendTxPending;

  const decimalsResolved = decimals ?? 18;
  const amountWei = amount ? (() => {
    try { return parseUnits(amount, decimalsResolved); } catch { return 0n; }
  })() : 0n;

  // lzV2OFT 是原生 OFT（burn/mint），无需 approve；其余协议需检查 allowance
  const needsApproval =
    tokenCfg.protocol !== 'lzV2OFT' &&
    allowance != null && amountWei > 0n && allowance < amountWei;
  const isBobaFixed = tokenCfg.protocol === 'bobaCustom';
  const needsQuote   = tokenCfg.protocol !== 'bobaCustom';

  // ── 获取跨链费用 ──────────────────────────────────────────────
  const handleQuote = async () => {
    setQuoteError(null);
    if (!address) { setQuoteError('请先连接钱包'); return; }
    if (amountWei <= 0n) { setQuoteError('请输入有效数量'); return; }
    setIsQuoting(true);
    setQuoteNative(null);
    const to = (recipient && recipient.startsWith('0x') ? recipient : address) as Address;
    const viemChain = CHAIN_ID_TO_VIEM[fromChainCfg.chainId];
    const client = publicClient && isCorrectChain
      ? publicClient
      : createPublicClient({ chain: viemChain, transport: http(fromChainCfg.rpcUrl) });
    try {
      if (tokenCfg.protocol === 'lzV2OFT') {
        // ── LZ V2 OFT：调用 quoteSend ──
        const sendParam = {
          dstEid: toChainCfg.eid,
          to: addressToBytes32(to),
          amountLD: amountWei,
          minAmountLD: 0n,
          extraOptions: LZ_V2_EXTRA_OPTIONS,
          composeMsg: '0x' as `0x${string}`,
          oftCmd:     '0x' as `0x${string}`,
        };
        const msgFee = await client.readContract({
          address: fromTokenCfg.bridgeAddress,
          abi: oftAbi,
          functionName: 'quoteSend',
          args: [sendParam, false],
        });
        setQuoteNative((msgFee.nativeFee * 120n) / 100n);
        return;
      }

      // zcxCustom：调用 OFT 代理合约的 estimateSendFee
      // lzV1OFT ：调用代币合约自身的 estimateSendFee（代币 = OFT）
      const estimateTarget =
        tokenCfg.protocol === 'zcxCustom'
          ? fromTokenCfg.oftProxy!
          : fromTokenCfg.bridgeAddress;

      const [nativeFee] = await client.readContract({
        address: estimateTarget,
        abi: lzV1OFTAbi,
        functionName: 'estimateSendFee',
        args: [
          toChainCfg.lzV1ChainId,
          addressToPackedBytes(to),
          amountWei,
          false,
          tokenCfg.protocol === 'zcxCustom'
            ? ZCX_ADAPTER_PARAMS
            : ('0x' as `0x${string}`),
        ],
      }) as [bigint, bigint];

      setQuoteNative((nativeFee * 120n) / 100n); // +20% 余量
    } catch (e) {
      // estimateSendFee 失败时使用后备估算值
      const fallback = fromTokenCfg.defaultFeeEstimate;
      if (fallback != null) {
        setQuoteNative(fallback);
        setQuoteError(`链上报价失败，已使用估算值 ${formatUnits(fallback, 18)} ${fromChainCfg.nativeSymbol}`);
      } else {
        setQuoteError('获取费用失败：' + (e instanceof Error ? e.message : String(e)));
      }
      console.error(e);
    } finally {
      setIsQuoting(false);
    }
  };

  // ── 授权 ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!address || amountWei <= 0n) return;
    setSendError(null);
    try {
      await approveAsync({
        address: fromTokenCfg.tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [fromTokenCfg.bridgeAddress, amountWei],
      });
      await refetchAllowance();
    } catch (e) {
      setSendError('授权失败：' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── 发送跨链 ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!address || amountWei <= 0n) return;
    const fee = isBobaFixed ? (fromTokenCfg.defaultFeeEstimate ?? 0n) : quoteNative;
    if (fee == null) { setSendError('请先点击「获取跨链费用」'); return; }
    setSendError(null);
    setTxHash(null);
    const to = (recipient && recipient.startsWith('0x') ? recipient : address) as Address;
    try {
      let hash: string | undefined;

      if (tokenCfg.protocol === 'bobaCustom') {
        if (safeFromChain === 'bnb') {
          hash = await sendContractAsync({
            address: fromTokenCfg.bridgeAddress, abi: bnbBridgeAbi,
            functionName: 'withdraw',
            args: [fromTokenCfg.tokenAddress, amountWei, ZERO_ADDRESS, '0x', '0x'],
            value: fee,
          });
        } else {
          hash = await sendContractAsync({
            address: fromTokenCfg.bridgeAddress, abi: ethBridgeAbi,
            functionName: 'depositERC20',
            args: [fromTokenCfg.tokenAddress, toTokenCfg.tokenAddress, amountWei, ZERO_ADDRESS, '0x', '0x'],
            value: fee,
          });
        }

      } else if (tokenCfg.protocol === 'lzV2OFT') {
        // LZ V2 OFT：标准 send(sendParam, fee, refundAddress)
        const sendParam = {
          dstEid: toChainCfg.eid,
          to: addressToBytes32(to),
          amountLD: amountWei,
          minAmountLD: 0n,
          extraOptions: LZ_V2_EXTRA_OPTIONS,
          composeMsg: '0x' as `0x${string}`,
          oftCmd:     '0x' as `0x${string}`,
        };
        hash = await sendContractAsync({
          address: fromTokenCfg.bridgeAddress,
          abi: oftAbi,
          functionName: 'send',
          args: [sendParam, { nativeFee: fee, lzTokenFee: 0n }, address],
          value: fee,
        });

      } else if (tokenCfg.protocol === 'lzV1OFT') {
        hash = await sendContractAsync({
          address: fromTokenCfg.bridgeAddress, abi: lzV1OFTAbi,
          functionName: 'sendFrom',
          args: [address, toChainCfg.lzV1ChainId, addressToPackedBytes(to),
            amountWei, address, ZERO_ADDRESS, '0x'],
          value: fee,
        });

      } else {
        // zcxCustom：原始交易，手动编码 0xd041024c 调用
        const calldata = encodeZCXBridgeData({
          oftProxy: fromTokenCfg.oftProxy!,
          from: address,
          dstEvmChainId: BigInt(toChainCfg.chainId),
          dstLzChainId:  BigInt(toChainCfg.lzV1ChainId),
          srcToken: fromTokenCfg.tokenAddress,
          amount: amountWei,
        });
        hash = await sendTransactionAsync({
          to: fromTokenCfg.bridgeAddress,
          data: calldata,
          value: fee,
        });
      }

      setTxHash(hash ?? null);
    } catch (e) {
      setSendError('发送失败：' + (e instanceof Error ? e.message : String(e)));
      console.error(e);
    }
  };

  // ── 切换网络 ──────────────────────────────────────────────────
  const switchToSourceChain = async () => {
    setSwitchError(null);
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: fromChainCfg.chainId });
    } catch (switchErr) {
      const isMissing =
        switchErr instanceof Error &&
        (switchErr.message.includes('4902') ||
          /unrecognized|unknown chain/i.test(switchErr.message));
      if (isMissing && typeof window !== 'undefined' && (window as any).ethereum) {
        const CHAIN_PARAMS: Record<number, object> = {
          56:   { chainId: '0x38',   chainName: 'BNB Smart Chain',   nativeCurrency: { name: 'BNB',   symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc.publicnode.com'],            blockExplorerUrls: ['https://bscscan.com'] },
          1:    { chainId: '0x1',    chainName: 'Ethereum Mainnet',   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'],  blockExplorerUrls: ['https://etherscan.io'] },
          137:  { chainId: '0x89',   chainName: 'Polygon Mainnet',    nativeCurrency: { name: 'POL',   symbol: 'POL', decimals: 18 }, rpcUrls: ['https://polygon-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'], blockExplorerUrls: ['https://polygonscan.com'] },
          8453: { chainId: '0x2105', chainName: 'Base Mainnet',       nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://base-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'],  blockExplorerUrls: ['https://basescan.org'] },
        };
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CHAIN_PARAMS[fromChainCfg.chainId]],
          });
        } catch (addErr) {
          setSwitchError('添加网络失败：' + (addErr instanceof Error ? addErr.message : String(addErr)));
        }
      } else {
        setSwitchError('切换网络失败：' + (switchErr instanceof Error ? switchErr.message : String(switchErr)));
      }
    } finally {
      setIsSwitching(false);
    }
  };

  if (!address) {
    return <div className="panel"><p>请先连接钱包</p></div>;
  }

  const recipientDisplay = recipient && recipient.startsWith('0x') ? recipient : address;

  return (
    <div className="panel">
      <h2>跨链桥</h2>

      {/* 代币选择 */}
      <div className="field token-selector">
        <label>代币</label>
        <div className="token-buttons">
          {Object.keys(allTokens).map((tk) => (
            <button key={tk} type="button"
              className={`token-btn ${tokenKey === tk ? 'active' : ''}`}
              onClick={() => {
                const nc = allTokens[tk as TokenKey];
                setTokenKey(tk as TokenKey);
                setFromChain(nc.chainPairs[0][0]);
                setAmount(''); setQuoteNative(null); setQuoteError(null);
                setTxHash(null); setSendError(null); setSwitchError(null);
              }}
            >
              {allTokens[tk].symbol}
            </button>
          ))}
        </div>
      </div>

      {/* 网络提示 */}
      {!isCorrectChain && (
        <div className="notice">
          <p>当前网络不是 {fromChainCfg.name}，请先切换网络。</p>
          <button type="button" onClick={switchToSourceChain} disabled={isSwitching}>
            {isSwitching ? '切换中…' : `切换到 ${fromChainCfg.name}`}
          </button>
          {switchError && <p className="error">{switchError}</p>}
        </div>
      )}

      {/* 源链 */}
      <div className="field">
        <label>从</label>
        <select value={safeFromChain}
          onChange={(e) => { setFromChain(e.target.value as ChainKey); setSwitchError(null); }}>
          {tokenCfg.chainPairs.flatMap(([a, b]) => [a, b])
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((ck) => <option key={ck} value={ck}>{CHAINS[ck].name}</option>)}
        </select>
      </div>

      {/* 目标链 */}
      <div className="field">
        <label>到</label>
        <span>{toChainCfg.name}</span>
      </div>

      {/* 数量 */}
      <div className="field">
        <label>数量 ({tokenCfg.symbol})</label>
        <input type="text" value={amount} placeholder="0"
          onChange={(e) => { setAmount(e.target.value); setQuoteNative(null); }} />
        {balance != null && (
          <span className="hint">余额: {formatUnits(balance.value, balance.decimals)} {tokenCfg.symbol}</span>
        )}
      </div>

      {/* 接收地址 */}
      <div className="field">
        <label>接收地址（可选，默认当前地址）</label>
        <input type="text" value={recipient} placeholder={address}
          onChange={(e) => { setRecipient(e.target.value); setQuoteNative(null); }} />
        {recipientDisplay && (
          <span className="hint">接收: {recipientDisplay.slice(0, 10)}…</span>
        )}
      </div>

      {/* 费用显示 */}
      {isBobaFixed && (
        <div className="fee-info">
          <p>
            预计跨链费用：约 {formatUnits(fromTokenCfg.defaultFeeEstimate ?? 0n, 18)} {fromChainCfg.nativeSymbol}
            <span className="hint">（以链上实际消耗为准）</span>
          </p>
        </div>
      )}
      {!isBobaFixed && quoteNative != null && (
        <div className="fee-info">
          <p>
            预计跨链费用：{formatUnits(quoteNative, 18)} {fromChainCfg.nativeSymbol}
            <span className="hint">（含 20% 余量）</span>
          </p>
        </div>
      )}

      {/* 操作 */}
      <div className="actions">
        {needsQuote && (
          <button type="button" onClick={handleQuote} disabled={isQuoting || amountWei <= 0n}>
            {isQuoting ? '获取费用中…' : '获取跨链费用'}
          </button>
        )}
        {quoteError && <p className="error">{quoteError}</p>}

        {needsApproval && (
          <button type="button" onClick={handleApprove}
            disabled={isApprovePending || !isCorrectChain || amountWei <= 0n}>
            {isApprovePending ? '授权中…' : `授权 ${tokenCfg.symbol}`}
          </button>
        )}

        <button type="button" onClick={handleSend}
          disabled={isSendPending || needsApproval || !isCorrectChain || amountWei <= 0n
            || (needsQuote && quoteNative == null)}>
          {isSendPending ? '发送中…' : `发起跨链 (${fromChainCfg.name} → ${toChainCfg.name})`}
        </button>

        {sendError && <p className="error">{sendError}</p>}
      </div>

      {/* 成功 */}
      {txHash && (
        <p className="success">
          交易已提交:{' '}
          <a href={`${fromChainCfg.blockExplorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </a>
          <br />
          <a href={`https://layerzeroscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            LayerZero Scan 查看跨链进度 →
          </a>
        </p>
      )}
    </div>
  );
}
