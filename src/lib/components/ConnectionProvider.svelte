<script lang="ts">
	import { Connection, type ConnectionConfig } from '@solana/web3.js';
	import type { Snippet } from 'svelte';
	import { setSolanaContext, useSolana } from '../useSolana.svelte.js';
	import { WalletContext } from '../useWallet.svelte.js';

	const {
		endpoint,
		config,
		children
	}: {
		/** The endpoint of the RPC, e.g. https://api.devnet.solana.com, https://api.mainnet-beta.solana.com, etc. */
		endpoint: string;
		/** The configuration of the RPC, e.g. the commitment. */
		config: ConnectionConfig;
		children: Snippet;
	} = $props();

	setSolanaContext({
		connection: new Connection(endpoint, config),
		context: new WalletContext()
	});
</script>

{@render children()}
