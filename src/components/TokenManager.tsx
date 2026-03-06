import { useState } from 'react';
import { parseUnits } from 'viem';
import { CHAINS, type ChainKey } from '../config/chains';
import type { BridgeProtocol } from '../config/tokens';
import {
  getCustomTokens, saveCustomToken, deleteCustomToken,
  isBuiltinToken, getAllTokens,
} from '../config/customTokens';

// ── Calldata 解码器 ────────────────────────────────────────────
const METHOD_MAP: Record<string, { protocol: BridgeProtocol; label: string }> = {
  '0xc7c7f5b3': { protocol: 'lzV2OFT',   label: 'LayerZero V2 OFT send (lzV2OFT) ✅' },
  '0xd041024c': { protocol: 'zcxCustom',  label: 'Unizen 自定义桥 (zcxCustom)' },
  '0x51905636': { protocol: 'lzV1OFT',   label: 'LayerZero V1 OFT sendFrom (lzV1OFT)' },
  '0x6fb2be6d': { protocol: 'bobaCustom', label: 'Boba withdraw BNB→ETH (bobaCustom)' },
  '0x0d265fdb': { protocol: 'bobaCustom', label: 'Boba depositERC20 ETH→BNB (bobaCustom)' },
};

type Decoded = {
  methodId: string;
  protocol: BridgeProtocol | 'unknown';
  label: string;
  oftProxy?: string;
};

function decodeCalldata(hex: string): Decoded | null {
  const clean = hex.trim().replace(/\s+/g, '').toLowerCase();
  if (!clean.startsWith('0x') || clean.length < 10) return null;
  const methodId = clean.slice(0, 10);
  const info = METHOD_MAP[methodId];
  if (!info) return { methodId, protocol: 'unknown', label: `未知方法 ID: ${methodId}` };

  let oftProxy: string | undefined;
  if (methodId === '0xd041024c' && clean.length >= 138) {
    // tuple 第 2 个 32 字节（args[32-63]）为 OFT 代理地址
    oftProxy = '0x' + clean.slice(98, 138);
  }
  return { methodId, ...info, ...(oftProxy ? { oftProxy } : {}) };
}

// ── 表单类型 ──────────────────────────────────────────────────
const PROTOCOL_OPTIONS: { value: BridgeProtocol; label: string }[] = [
  { value: 'lzV2OFT',   label: 'lzV2OFT — LayerZero V2 OFT send (0xc7c7f5b3)' },
  { value: 'zcxCustom',  label: 'zcxCustom — Unizen 桥 (0xd041024c)' },
  { value: 'lzV1OFT',   label: 'lzV1OFT — LayerZero V1 sendFrom' },
  { value: 'bobaCustom', label: 'bobaCustom — Boba 自定义桥' },
];

type FormData = {
  symbol: string; name: string; protocol: BridgeProtocol;
  fromChain: ChainKey; toChain: ChainKey;
  fromToken: string; fromBridge: string; fromProxy: string; fromFee: string;
  toToken: string;   toBridge: string;   toProxy: string;   toFee: string;
};

const emptyForm: FormData = {
  symbol: '', name: '', protocol: 'zcxCustom',
  fromChain: 'polygon', toChain: 'eth',
  fromToken: '', fromBridge: '', fromProxy: '', fromFee: '',
  toToken:   '', toBridge:   '', toProxy:   '', toFee: '',
};

function isAddress(v: string) { return /^0x[0-9a-fA-F]{40}$/.test(v); }

function parseFee(s: string): bigint {
  if (!s || s.trim() === '' || s.trim() === '0') return 0n;
  try { return parseUnits(s.trim(), 18); }
  catch { return 0n; }
}

const CHAIN_KEYS = Object.keys(CHAINS) as ChainKey[];

// ── 主组件 ────────────────────────────────────────────────────
export function TokenManager() {
  const [calldata, setCalldata] = useState('');
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [decodeErr, setDecodeErr] = useState('');
  const [showDecoder, setShowDecoder] = useState(true);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState('');

  const [customList, setCustomList] = useState(getCustomTokens);

  const needProxy = form.protocol === 'zcxCustom';
  const needFee   = form.protocol !== 'lzV1OFT' && form.protocol !== 'lzV2OFT';

  // ── 解码 ──
  function handleDecode() {
    setDecodeErr('');
    const result = decodeCalldata(calldata);
    if (!result) { setDecodeErr('无法解析，请确认输入了正确的 calldata hex'); return; }
    setDecoded(result);
  }

  function applyDecoded() {
    if (!decoded) return;
    setForm(f => ({
      ...f,
      protocol: decoded.protocol === 'unknown' ? f.protocol : decoded.protocol,
      fromProxy: decoded.oftProxy ?? f.fromProxy,
    }));
  }

  // ── 表单 ──
  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.symbol.trim()) e.symbol = '必填';
    if (!form.name.trim())   e.name   = '必填';
    if (form.fromChain === form.toChain) e.toChain = '目标链不能与源链相同';
    if (!isAddress(form.fromToken))  e.fromToken  = '无效地址';
    if (!isAddress(form.fromBridge)) e.fromBridge = '无效地址';
    if (needProxy && !isAddress(form.fromProxy)) e.fromProxy = '无效地址（zcxCustom 必填）';
    if (!isAddress(form.toToken))    e.toToken    = '无效地址';
    if (!isAddress(form.toBridge))   e.toBridge   = '无效地址';
    if (needProxy && !isAddress(form.toProxy))   e.toProxy   = '无效地址（zcxCustom 必填）';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdd() {
    setSaved('');
    if (!validate()) return;
    const key = form.symbol.trim().toUpperCase();
    if (isBuiltinToken(key)) {
      setErrors(e => ({ ...e, symbol: `内置代币 ${key} 不可覆盖` }));
      return;
    }
    const fromFeeBI = parseFee(form.fromFee);
    const toFeeBI   = parseFee(form.toFee);
    saveCustomToken(key, {
      symbol: form.symbol.trim(),
      name:   form.name.trim(),
      protocol: form.protocol,
      chainPairs: [[form.fromChain, form.toChain]],
      chains: {
        [form.fromChain]: {
          tokenAddress:  form.fromToken  as `0x${string}`,
          bridgeAddress: form.fromBridge as `0x${string}`,
          ...(needProxy && form.fromProxy ? { oftProxy: form.fromProxy as `0x${string}` } : {}),
          ...(needFee && fromFeeBI > 0n ? { defaultFeeEstimate: fromFeeBI } : {}),
        },
        [form.toChain]: {
          tokenAddress:  form.toToken    as `0x${string}`,
          bridgeAddress: form.toBridge   as `0x${string}`,
          ...(needProxy && form.toProxy   ? { oftProxy: form.toProxy   as `0x${string}` } : {}),
          ...(needFee && toFeeBI > 0n   ? { defaultFeeEstimate: toFeeBI }   : {}),
        },
      },
    });
    setCustomList(getCustomTokens());
    setSaved(`代币 ${key} 已添加！刷新或切换到「跨链桥」页面即可使用。`);
    setForm(emptyForm);
    setCalldata(''); setDecoded(null);
  }

  function handleDelete(key: string) {
    if (!confirm(`确认删除自定义代币 ${key}？`)) return;
    deleteCustomToken(key);
    setCustomList(getCustomTokens());
  }

  const allTokens = getAllTokens();

  // ── 渲染辅助 ──
  function field(label: string, key: keyof FormData, placeholder = '', tip = '') {
    return (
      <div className="mg-field">
        <label>{label}</label>
        <input
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
          className={errors[key] ? 'input-err' : ''}
        />
        {errors[key] && <span className="mg-err">{errors[key]}</span>}
        {tip && <span className="hint">{tip}</span>}
      </div>
    );
  }

  return (
    <div className="manager">

      {/* ── Calldata 解码器 ── */}
      <div className="mg-section">
        <div className="mg-section-hd" onClick={() => setShowDecoder(v => !v)}>
          <span>🔍 从 Calldata 解析协议信息</span>
          <span className="mg-toggle">{showDecoder ? '▲' : '▼'}</span>
        </div>
        {showDecoder && (
          <div className="mg-section-bd">
            <p className="hint">在区块浏览器找到成功交易 → Input Data → 复制原始 hex → 粘贴到下方</p>
            <textarea
              className="mg-textarea"
              rows={3}
              value={calldata}
              onChange={e => { setCalldata(e.target.value); setDecoded(null); setDecodeErr(''); }}
              placeholder="0xd041024c0000..."
            />
            <button type="button" className="mg-btn" onClick={handleDecode}>解析</button>
            {decodeErr && <p className="mg-err">{decodeErr}</p>}
            {decoded && (
              <div className="mg-decoded">
                <div className="mg-decoded-row">
                  <span>方法 ID：</span><code>{decoded.methodId}</code>
                </div>
                <div className="mg-decoded-row">
                  <span>协议类型：</span>
                  <code className={decoded.protocol === 'unknown' ? 'c-warn' : 'c-ok'}>{decoded.label}</code>
                </div>
                {decoded.oftProxy && (
                  <div className="mg-decoded-row">
                    <span>OFT 代理地址：</span><code>{decoded.oftProxy}</code>
                  </div>
                )}
                {decoded.protocol !== 'unknown' && (
                  <button type="button" className="mg-btn mg-btn-sm" onClick={applyDecoded}>
                    应用到表单（自动填写协议 + OFT代理）
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 添加代币表单 ── */}
      <div className="mg-section">
        <div className="mg-section-hd"><span>➕ 添加代币</span></div>
        <div className="mg-section-bd">

          <div className="mg-row">
            <div className="mg-field">
              <label>代币符号 <span className="c-warn">*</span></label>
              <input value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())}
                placeholder="如 ZCX" className={errors.symbol ? 'input-err' : ''} />
              {errors.symbol && <span className="mg-err">{errors.symbol}</span>}
            </div>
            <div className="mg-field">
              <label>代币全名 <span className="c-warn">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="如 ZCX Token" className={errors.name ? 'input-err' : ''} />
              {errors.name && <span className="mg-err">{errors.name}</span>}
            </div>
          </div>

          <div className="mg-field">
            <label>协议类型 <span className="c-warn">*</span></label>
            <select value={form.protocol} onChange={e => set('protocol', e.target.value as BridgeProtocol)}>
              {PROTOCOL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="mg-row">
            <div className="mg-field">
              <label>源链 <span className="c-warn">*</span></label>
              <select value={form.fromChain} onChange={e => set('fromChain', e.target.value as ChainKey)}>
                {CHAIN_KEYS.map(k => <option key={k} value={k}>{CHAINS[k].name}</option>)}
              </select>
            </div>
            <div className="mg-arrow">→</div>
            <div className="mg-field">
              <label>目标链 <span className="c-warn">*</span></label>
              <select value={form.toChain} onChange={e => set('toChain', e.target.value as ChainKey)}
                className={errors.toChain ? 'input-err' : ''}>
                {CHAIN_KEYS.filter(k => k !== form.fromChain).map(k =>
                  <option key={k} value={k}>{CHAINS[k].name}</option>)}
              </select>
              {errors.toChain && <span className="mg-err">{errors.toChain}</span>}
            </div>
          </div>

          {/* 源链字段 */}
          <div className="mg-chain-block">
            <div className="mg-chain-title">── {CHAINS[form.fromChain].name} 配置</div>
            {field('代币合约地址 *', 'fromToken', '0x...')}
            {field('桥接应用合约 *', 'fromBridge', '0x...')}
            {needProxy && field('OFT 代理地址 *', 'fromProxy', '0x...（从Calldata解析）')}
            {needFee && field(
              `跨链费用估算 (${CHAINS[form.fromChain].nativeSymbol})`,
              'fromFee', '如 25 或 0.005',
              '留空则发送时无 native 费用'
            )}
            {!needFee && (
              <p className="hint">
                {form.protocol === 'lzV2OFT'
                  ? 'lzV2OFT 费用将通过 quoteSend 自动从链上查询，无需 approve'
                  : 'lzV1OFT 费用将在点击「获取跨链费用」时自动从链上查询'}
              </p>
            )}
          </div>

          {/* 目标链字段 */}
          <div className="mg-chain-block">
            <div className="mg-chain-title">── {CHAINS[form.toChain].name} 配置</div>
            {field('代币合约地址 *', 'toToken', '0x...')}
            {field('桥接应用合约 *', 'toBridge', '0x...')}
            {needProxy && field('OFT 代理地址 *', 'toProxy', '0x...（从目标链Calldata解析）')}
            {needFee && field(
              `跨链费用估算 (${CHAINS[form.toChain].nativeSymbol})`,
              'toFee', '如 0.001',
              '留空则发送时无 native 费用'
            )}
          </div>

          <button type="button" className="mg-btn mg-btn-primary" onClick={handleAdd}>
            添加代币
          </button>
          {saved && <p className="mg-ok">{saved}</p>}
        </div>
      </div>

      {/* ── 代币列表 ── */}
      <div className="mg-section">
        <div className="mg-section-hd"><span>📦 当前代币列表</span></div>
        <div className="mg-section-bd">
          <table className="mg-table">
            <thead>
              <tr>
                <th>符号</th><th>名称</th><th>链对</th><th>协议</th><th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allTokens).map(([key, cfg]) => (
                <tr key={key} className={isBuiltinToken(key) ? '' : 'mg-row-custom'}>
                  <td><strong>{cfg.symbol}</strong></td>
                  <td>{cfg.name}</td>
                  <td>{cfg.chainPairs.map(([a, b]) => `${CHAINS[a]?.name ?? a} ↔ ${CHAINS[b]?.name ?? b}`).join(', ')}</td>
                  <td><code className="mg-proto">{cfg.protocol}</code></td>
                  <td>
                    {!isBuiltinToken(key) ? (
                      <button type="button" className="mg-del" onClick={() => handleDelete(key)}>🗑</button>
                    ) : <span className="hint">内置</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(customList).length === 0 && (
            <p className="hint" style={{ marginTop: '0.5rem' }}>暂无自定义代币</p>
          )}
        </div>
      </div>
    </div>
  );
}
