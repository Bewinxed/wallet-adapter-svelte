import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';

export default function getInferredChainFromEndpoint(endpoint?: string): Chain {
    if (!endpoint) {
        return 'mainnet-beta';
    }
    if (/devnet/i.test(endpoint)) {
        return 'solana:devnet';
    }
    if (/testnet/i.test(endpoint)) {
        return 'solana:testnet';
    }
    if (/mainnet-beta/i.test(endpoint)) {
        return 'solana:mainnet-beta';
    }

    return 'solana:mainnet'
}
