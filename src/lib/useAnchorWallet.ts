import type {
     PublicKey,
     Transaction,
     TransactionMessage,
} from "@solana/web3.js";
// import { useMemo } from "react";
import { useWallet } from "./useWallet.svelte.js";
import { useSolana } from "./useSolana.svelte.js";

export interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction<T extends TransactionMessage>(
        transaction: T,
    ): Promise<T>;
    signAllTransactions<T extends TransactionMessage>(
        transactions: T[],
    ): Promise<T[]>;
}

export function useAnchorWallet(): AnchorWallet | undefined {
    const {context} = useSolana();
    const {wallet} = $derived(context)
    const anchorWallet = $derived(wallet ? {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
    } : {
        publicKey: undefined,
        signTransaction: undefined,
        signAllTransactions: undefined,
    })
    return anchorWallet
}
