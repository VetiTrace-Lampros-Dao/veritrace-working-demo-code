import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'VeriTrace',
  projectId: 'b56e18d47c72ab683b10814fe9495694',
  chains: [arbitrumSepolia],
  ssr: false,
});
