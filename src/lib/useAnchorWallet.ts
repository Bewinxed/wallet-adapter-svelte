import type { Address, Transaction, TransactionMessage } from '@solana/web3.js';
// import { useMemo } from "react";
import { useSolana } from './useSolana.svelte.js';

export interface AnchorWallet {
	address: Address;
	signTransaction<T extends TransactionMessage>(transaction: T): Promise<T>;
	signAllTransactions<T extends TransactionMessage>(transactions: T[]): Promise<T[]>;
}

export function useAnchorWallet(): AnchorWallet | undefined {
	const { context } = useSolana();
	const { wallet } = $derived(context);
	const anchorWallet = $derived(
		wallet
			? {
					address: wallet.address,
					signTransaction: wallet.signTransaction,
					signAllTransactions: wallet.signAllTransactions
				}
			: {
					address: undefined,
					signTransaction: undefined,
					signAllTransactions: undefined
				}
	);
	return anchorWallet;
}
