import {
	WalletError,
	WalletNotConnectedError,
	WalletNotReadyError,
	WalletReadyState,
	type Adapter,
	type MessageSignerWalletAdapterProps,
	type SignInMessageSignerWalletAdapterProps,
	type SignerWalletAdapterProps,
	type WalletAdapterProps,
	type WalletName
} from '@bewinxed/wallet-adapter-base';
import { address, type Address } from '@solana/web3.js';
import { getContext, hasContext, setContext, untrack } from 'svelte';

export interface WalletType {
	adapter: Adapter;
	readyState: WalletReadyState;
}

export class Wallet implements WalletType {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	/**The adapter that is currently selected */
	adapter = $state<Adapter>()!;
	/**The status of the wallet */
	status = $state<'connecting' | 'connected' | 'disconnecting' | 'disconnected'>('disconnected');
	/**Whether the wallet is selected */
	selected = $state(false);
	/**The public key of the wallet (Don't depend on this for reactivity (For Now)) */
	address = $state<Address | null>(this.adapter?.address ?? null);
	/**The ready state of the wallet */
	readyState = $derived(this.adapter?.readyState ?? WalletReadyState.NotDetected);
	/**The error handler for the wallet */
	onerror = $state<(error: WalletError, adapter?: Adapter) => void>();
	handleError = (error: WalletError, adapter?: Adapter) => {
		if (this.onerror) {
			this.onerror(error, adapter);
		} else {
			console.error(error, adapter);
			if (error instanceof WalletNotReadyError && typeof window !== 'undefined' && adapter) {
				window.open(adapter.url, '_blank');
			}
		}
	};

	readonly connect: WalletAdapterProps['connect'] = $derived(async () => {
		if (
			this.status === 'connecting' ||
			this.status === 'connected' ||
			this.status === 'disconnecting'
		) {
			console.warn('already connecting or connected or disconnecting');
			return;
		}
		this.selected = true;
		if (this.readyState !== WalletReadyState.Installed) {
			await this.adapter.autoConnect();
		}

		try {
			await this.adapter.connect();
			this.address = this.adapter.address;
			this.status = 'connected';
			console.debug(
				'connected adapter',
				this.adapter.name,
				'connected public key',
				this.adapter.address
			);
		} catch (e) {
			if (e instanceof WalletError) {
				throw this.handleError(e, this.adapter);
			}
			throw e;
		}
	});
	readonly autoconnect = $derived.by(() => {
		// if member is private
		if (
			'autoConnect' in this.adapter &&
			Object.getOwnPropertyDescriptor(this.adapter, 'autoConnect')?.value !== undefined
		) {
			return this.adapter.autoConnect;
			// biome-ignore lint/style/noUselessElse: <explanation>
		} else {
			return this.connect;
		}
	});
	readonly disconnect: WalletAdapterProps['disconnect'] = $derived(async () => {
		if (this.status === 'disconnecting') {
			return;
		}

		this.status = 'disconnecting';

		const previousStatus = this.status;

		try {
			await this.adapter.disconnect();
			this.status = 'disconnected';
			this.address = null;
		} catch (e) {
			this.status = previousStatus;
			if (e instanceof WalletError) throw this.handleError(e, this.adapter);
		}
	});
	readonly sendTransaction = $derived(
		(...args: Parameters<WalletAdapterProps['sendTransaction']>) => {
			if (this.status !== 'connected')
				throw this.handleError(new WalletNotConnectedError(), this.adapter);
			if (!('sendTransaction' in this.adapter))
				return logMissingProviderError('call', 'sendTransaction');
			return this.adapter.sendTransaction(...args);
		}
	);
	readonly signTransaction = $derived(
		(...args: Parameters<SignerWalletAdapterProps['signTransaction']>) => {
			if (this.status !== 'connected')
				throw this.handleError(new WalletNotConnectedError(), this.adapter);
			if (!('signTransaction' in this.adapter))
				return logMissingProviderError('call', 'signTransaction');
			return this.adapter.signTransaction(...args);
		}
	);
	readonly signAllTransactions = $derived(
		(...args: Parameters<SignerWalletAdapterProps['signAllTransactions']>) => {
			if (this.status !== 'connected')
				throw this.handleError(new WalletNotConnectedError(), this.adapter);
			if (!('signAllTransactions' in this.adapter))
				return logMissingProviderError('call', 'signAllTransactions');
			return this.adapter.signAllTransactions(...args);
		}
	);
	readonly signMessage = $derived(
		(...args: Parameters<MessageSignerWalletAdapterProps['signMessage']>) => {
			if (this.status !== 'connected')
				throw this.handleError(new WalletNotConnectedError(), this.adapter);
			if (!('signMessage' in this.adapter)) return logMissingProviderError('call', 'signMessage');
			return this.adapter.signMessage(...args);
		}
	);
	readonly signIn = $derived(
		(...args: Parameters<SignInMessageSignerWalletAdapterProps['signIn']>) => {
			if (this.status !== 'connected')
				throw this.handleError(new WalletNotConnectedError(), this.adapter);
			if (!('signIn' in this.adapter)) return logMissingProviderError('call', 'signIn');
			return this.adapter.signIn(...args);
		}
	);
	constructor(adapter: Adapter) {
		this.adapter = adapter;
		$effect(() => {
			console.log('adapter select status', this.selected, this.status);
		});
	}
}

export interface WalletContextState {
	autoConnect: boolean;

	selectedAdapter: Adapter | null;

	adapters: Adapter[];

	wallets: WalletType[];
	wallet: Wallet | null;

	address: Address | null;

	connecting: boolean;
	connected: boolean;
	disconnecting: boolean;

	select(walletName: WalletName | null): void;
}

export class WalletContext implements WalletContextState {
	adapters = $state<Adapter[]>([]);
	readonly wallets = $derived<Wallet[]>(
		this.adapters.reduce<Wallet[]>((wallets, adapter) => {
			console.debug('adapters', adapter.name, adapter.readyState, 'updated');
			const wallet = untrack(() => new Wallet(adapter));
			if (wallet.readyState !== WalletReadyState.Unsupported) {
				wallets.push(wallet);
			}
			return wallets;
		}, [])
	);

	selectedAdapter = $state<Adapter | null>(null) as Adapter | null;

	readonly wallet = $derived(
		this.selectedAdapter
			? (this.wallets.find((wallet) => wallet.adapter === this.selectedAdapter) ?? null)
			: null
	);

	readonly address = $derived<Address | null>(
		this.selectedAdapter ? this.selectedAdapter?.address : null
	);

	readonly connected = $derived(this.wallet?.status === 'connected');

	readonly connecting = $derived(this.wallet?.status === 'connecting');

	readonly disconnecting = $derived(this.wallet?.status === 'disconnecting');

	autoConnect: boolean;

	isUnloading = $state(false);

	select = $state<(walletName: WalletName | null) => void>(() => {
		logMissingProviderError('call', 'select');
	});

	constructor(context?: Omit<WalletContextState, 'wallets'>) {
		this.adapters = context?.adapters ?? [];
		this.autoConnect = context?.autoConnect ?? false;
		this.select =
			context?.select ??
			(() => {
				logMissingProviderError('call', 'select');
			});
	}
}

function logMissingProviderError(action: string, property: string) {
	const error = new Error(
		`You have tried to ${action} "${property}" on a WalletContext without providing one. Make sure to render a WalletProvider as an ancestor of the component that uses WalletContext.`
	);
	console.error(error);
	return error;
}

export const WALLET_CONTEXT_KEY = Symbol('wallet');

export function setWalletContext(context: WalletContext) {
	return setContext(WALLET_CONTEXT_KEY, new WalletContext(context));
}

export function useWallet(): WalletContext {
	if (!hasContext(WALLET_CONTEXT_KEY)) {
		throw new Error('useWallet must be used within a WalletProvider');
	}
	return getContext<WalletContext>(WALLET_CONTEXT_KEY);
}
