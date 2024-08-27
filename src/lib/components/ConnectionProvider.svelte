<script lang="ts">
	import { createDefaultRpcTransport, createRpc, createSolanaRpcApi } from '@solana/web3.js';
	import type { Snippet } from 'svelte';
	import { setSolanaContext, type WrappedWalletRpc } from '../useSolana.svelte.js';
	import { WalletContext } from '../useWallet.svelte.js';

	const {
		endpoint,
		config,
		children
	}: {
		/** The endpoint of the RPC, e.g. https://api.devnet.solana.com, https://api.mainnet-beta.solana.com, etc. */
		endpoint: string;
		/** The configuration of the RPC, e.g. the commitment. */
		config: Parameters<typeof createSolanaRpcApi>[0];
		children: Snippet;
	} = $props();

	const api = createSolanaRpcApi(config);
	const transport = createDefaultRpcTransport({ url: endpoint });

	function wrappedTransport(): WrappedWalletRpc {
		const rpc = createRpc({
			transport,
			api
		});
		const url = endpoint;
		return {
			rpc,
			get endpoint() {
				return url;
			}
		};
	}

	setSolanaContext({
		rpc: wrappedTransport(),
		context: new WalletContext()
	});
</script>

{@render children()}
