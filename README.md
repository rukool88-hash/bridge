# BOBA OFT 跨链桥 (BNB ↔ ETH)

基于 [LayerZero V2 OFT](https://docs.layerzero.network/v2/developers/evm/oft/quickstart) 的 BOBA 代币桥接前端，支持 **BNB Chain** 与 **Ethereum** 之间的跨链转账。

## 合约地址

| 网络       | BOBA 代币合约 | OFT 桥接应用合约 |
|------------|----------------|-------------------|
| BNB Chain  | `0xE0DB679377A0F5Ae2BaE485DE475c9e1d8A4607D` | `0x819FF4d9215C9dAC76f5eC676b1355973157eBBa` |
| Ethereum   | `0x42bbfa2e77757c645eeaad1655e0911a7553efbc` | `0x1A36E24D61BC1aDa68C21C2Da1aD53EaB8E03e55` |

## 前置条件

- Node.js 18+
- 已部署并完成 LayerZero 配置的 OFT 合约（peers、libraries、enforced options 等）

## 安装与运行

```bash
npm install
npm run dev
```

浏览器打开控制台提示的本地地址（如 `http://localhost:5173`）。

## 使用步骤

1. **连接钱包**：点击「连接钱包」，并确保钱包支持 BNB Chain 与 Ethereum。
2. **选择方向**：选择「从」BNB Chain 或 Ethereum。
3. **切换网络**：若当前网络与「从」链不一致，按提示切换到对应网络。
4. **输入数量**：输入要桥接的 BOBA 数量（可参考余额）。
5. **接收地址**：可选；不填则使用当前连接地址。
6. **获取费用**：点击「获取跨链费用」获取本次跨链所需原生代币（BNB/ETH）费用。
7. **授权**：若为首次或额度不足，先点击「授权 BOBA」对 OFT 合约授权。
8. **发起跨链**：点击「发起跨链」，确认交易并支付上一步显示的原生费用。

跨链到账时间取决于 LayerZero 的确认与执行，可在 [LayerZero Scan](https://layerzeroscan.com/) 查询交易状态。

## 技术说明

- **EID**：Ethereum 主网 `30101`，BNB Smart Chain 主网 `30102`（以 [LayerZero 官方部署文档](https://docs.layerzero.network/v2/deployments/deployed-contracts) 为准）。
- **OFT 流程**：用户先对源链 OFT 合约授权 BOBA，再调用 OFT 的 `send`，并附带 `quoteSend` 返回的 `nativeFee` 作为 `msg.value`。
- 本仓库仅包含前端与配置，不包含合约部署与 LayerZero 链上配置（setPeer、setSendLibrary、setReceiveLibrary、enforced options 等）。

## 参考文档

- [LayerZero V2 OApp 概览](https://docs.layerzero.network/v2/developers/evm/oapp/overview)
- [LayerZero V2 OFT 快速开始](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero 部署与合约地址](https://docs.layerzero.network/v2/deployments/deployed-contracts)
