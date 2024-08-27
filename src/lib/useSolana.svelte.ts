import type { Adapter, WalletReadyState } from '@bewinxed/wallet-adapter-base';
import type {
	GetLatestBlockhashApi,
	GetSignatureStatusesApi,
	Rpc,
	SendTransactionApi
} from '@solana/web3.js';
import { getContext, hasContext, setContext } from 'svelte';
import type { WalletContext } from './useWallet.svelte';

export type WalletRpcMethods = GetLatestBlockhashApi & SendTransactionApi & GetSignatureStatusesApi;

export type WalletRpc = Rpc<WalletRpcMethods>;
export type WrappedWalletRpc = { rpc: WalletRpc; endpoint: string };
export interface WalletType {
	adapter: Adapter;
	readyState: WalletReadyState;
}

export interface SolanaProvider {
	rpc: WalletRpc;
	context: WalletContext;
}

const SOLANA_CONTEXT_KEY = Symbol('solana');

class Solana implements SolanaProvider {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	rpc = $state<WalletRpc>()!;
	endpoint = $state<string>()!;
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	context = $state<WalletContext>()!;

	constructor(rpc: WrappedWalletRpc, wallet: WalletContext) {
		this.rpc = rpc.rpc;
		this.endpoint = rpc.endpoint;
		this.context = wallet;
	}
}

export function setSolanaContext({
	rpc,
	context: wallet
}: {
	rpc: WrappedWalletRpc;
	context: WalletContext;
}) {
	return setContext(SOLANA_CONTEXT_KEY, new Solana(rpc, wallet));
}

export function useSolana(): SolanaProvider {
	if (!hasContext(SOLANA_CONTEXT_KEY)) {
		throw new Error('useSolana must be used within a SolanaProvider');
	}
	return getContext<SolanaProvider>(SOLANA_CONTEXT_KEY);
}
