import { useState } from 'react';
import { ConnectButton } from './components/ConnectButton';
import { BridgeForm } from './components/BridgeForm';
import { TokenManager } from './components/TokenManager';

type Tab = 'bridge' | 'manager';

export default function App() {
  const [tab, setTab] = useState<Tab>('bridge');

  return (
    <div className="app">
      <header className="header">
        <h1>跨链桥</h1>
        <p className="subtitle">BOBA · wUSDR · ZCX · bZCX · DMTR</p>

        <div className="tab-nav">
          <button
            type="button"
            className={`tab-btn ${tab === 'bridge' ? 'active' : ''}`}
            onClick={() => setTab('bridge')}
          >
            🌉 跨链桥
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'manager' ? 'active' : ''}`}
            onClick={() => setTab('manager')}
          >
            ⚙️ 代币管理
          </button>
        </div>

        <ConnectButton />
      </header>

      <main>
        {tab === 'bridge'   && <BridgeForm />}
        {tab === 'manager'  && <TokenManager />}
      </main>

      <footer className="footer">
        <p>
          基于{' '}
          <a href="https://docs.layerzero.network" target="_blank" rel="noopener noreferrer">
            LayerZero
          </a>{' '}
          构建
        </p>
      </footer>
    </div>
  );
}
