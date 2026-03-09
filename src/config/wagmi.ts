import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { bsc, mainnet, polygon, base, optimism } from 'wagmi/chains';

export const config = createConfig({
  chains: [bsc, mainnet, polygon, base, optimism],
  connectors: [injected()],
  transports: {
    [bsc.id]:       http('https://bsc.publicnode.com'),
    [mainnet.id]:   http('https://eth-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'),
    [polygon.id]:   http('https://polygon-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'),
    [base.id]:      http('https://base-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'),
    [optimism.id]:  http('https://opt-mainnet.g.alchemy.com/v2/xQ2zrEsiX-z3aSnxG0nMU'),
  },
});
