<script lang="ts">
	import {
		WalletReadyState,
		type Adapter,
		type WalletError,
		type WalletName
	} from '@bewinxed/wallet-adapter-base';
	import type { Address } from '@solana/web3.js';
	import type { Snippet } from 'svelte';
	import { useSolana } from '../useSolana.svelte.js';
	import type { Wallet } from '../useWallet.svelte.js';

	let {
		children,
		onAutoConnectRequest,
		onConnectError,
		onerror,
		onconnect,
		ondisconnect,
		onSelectWallet
	}: {
		children: Snippet;
		wallets: Adapter[];

		// NOTE: The presence/absence of this handler implies that auto-connect is enabled/disabled.
		onAutoConnectRequest?: () => Promise<void>;
		onConnectError: () => void;
		/** Called when the wallet adapter emits an error */
		onerror?: (error: WalletError, adapter?: Adapter) => void;
		/** Called when the wallet adapter emits a connect event */
		onconnect?: (address: Address) => void;
		/** Called when the wallet adapter emits a disconnect event */
		ondisconnect?: () => void;
		/** Called when a wallet is selected */
		onSelectWallet: (walletName: WalletName | null) => void;
	} = $props();

	const { context } = useSolana();

	const wallet = $derived(
		context.wallets.find((wallet) => wallet.adapter === context.selectedAdapter) ?? null
	);

	let didAttemptAutoConnect = $state(false);

	// When the adapter changes, clear the `autoConnect` tracking flag
	$effect(() => {
		console.debug('effect 3');
		if (context.selectedAdapter) {
			console.debug('resetting didAttemptAutoConnect');
			didAttemptAutoConnect = false;
		}
	});

	// If auto-connect is enabled, request to connect when the adapter changes and is ready
	$effect(() => {
		console.log('autoConnect', context.wallet?.adapter.name);
		if (!context.wallet) {
			return;
		}
		if (
			didAttemptAutoConnect ||
			context.wallet.status === 'connecting' ||
			context.wallet.status === 'connected' ||
			!onAutoConnectRequest ||
			!(
				wallet?.readyState === WalletReadyState.Installed ||
				wallet?.readyState === WalletReadyState.Loadable
			)
		)
			return;
		didAttemptAutoConnect = true;

		(async () => {
			try {
				await onAutoConnectRequest();
				// Note: The actual 'connected' state should be set by the handleConnect function
			} catch (e) {
				onConnectError();
				// Drop the error. It will be caught by `handleError` anyway.
			} finally {
				if (context.wallet!.status === 'connecting') {
					context.wallet!.status = 'disconnected';
				}
			}
		})();
	});

	context.autoConnect = !!onAutoConnectRequest;
	context.select = onSelectWallet;

	let lastUsedWallet = $state<Wallet | null>(null);

	$effect(() => {
		if (context.wallet) {
			lastUsedWallet = context.wallet;
		}
	});

	$effect(() => {
		// Setup and teardown event listeners when the adapter changes
		if (!context.wallet || !context.selectedAdapter) {
			return;
		}
		console.debug('adding listeners to adapter', context.wallet?.adapter.name);
		context.selectedAdapter.on('connect', context.wallet?.connect);
		if (onconnect) {
			context.wallet.adapter.on('connect', onconnect);
		}
		context.selectedAdapter.on('disconnect', context.wallet?.disconnect);
		if (ondisconnect) {
			context.wallet.adapter.on('disconnect', ondisconnect);
		}
		context.selectedAdapter.on('error', context.wallet?.handleError);
		if (onerror) {
			context.wallet.adapter.on('error', onerror);
		}

		return () => {
			if (lastUsedWallet) {
				console.debug('removing listeners from adapter', lastUsedWallet.adapter.name);
				lastUsedWallet.adapter.off('connect', lastUsedWallet.connect);
				if (onconnect) {
					lastUsedWallet.adapter.off('connect', onconnect);
				}
				lastUsedWallet.adapter.off('disconnect', lastUsedWallet.disconnect);
				if (ondisconnect) {
					lastUsedWallet.adapter.off('disconnect', ondisconnect);
				}
				lastUsedWallet.adapter.off('error', lastUsedWallet.handleError);
				if (onerror) {
					lastUsedWallet.adapter.off('error', onerror);
				}
			}
		};
	});
</script>

{@render children()}
