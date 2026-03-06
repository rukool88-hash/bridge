import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="connect-wrap">
        <span className="addr">{address.slice(0, 6)}…{address.slice(-4)}</span>
        <button type="button" onClick={() => disconnect()}>断开</button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-connect"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
    >
      {isPending ? '连接中…' : '连接钱包'}
    </button>
  );
}
