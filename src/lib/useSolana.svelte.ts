import type { Adapter, WalletReadyState } from '@solana/wallet-adapter-base';
import type { Connection } from '@solana/web3.js';
import { getContext, hasContext, setContext } from 'svelte';
import type { WalletContext } from './useWallet.svelte';

export interface WalletType {
	adapter: Adapter;
	readyState: WalletReadyState;
}

export interface SolanaProvider {
	connection: Connection;
	context: WalletContext;
}

const SOLANA_CONTEXT_KEY = Symbol('solana');

class Solana implements SolanaProvider {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	connection = $state<Connection>()!;
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	context = $state<WalletContext>()!;

	constructor(connection: Connection, wallet: WalletContext) {
		this.connection = connection;
		this.context = wallet;
	}
}

export function setSolanaContext({ connection, context: wallet }: SolanaProvider) {
	return setContext(SOLANA_CONTEXT_KEY, new Solana(connection, wallet));
}

export function useSolana(): SolanaProvider {
	if (!hasContext(SOLANA_CONTEXT_KEY)) {
		throw new Error('useSolana must be used within a SolanaProvider');
	}
	return getContext<SolanaProvider>(SOLANA_CONTEXT_KEY);
}
