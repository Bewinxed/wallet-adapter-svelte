<script lang="ts">
import {
	createDefaultAddressSelector,
	createDefaultAuthorizationResultCache,
	createDefaultWalletNotFoundHandler,
	SolanaMobileWalletAdapter,
	SolanaMobileWalletAdapterWalletName,
} from '@solana-mobile/wallet-adapter-mobile';

import { useStandardWalletAdapters } from '@bewinxed/wallet-standard-wallet-adapter-svelte';
import { WalletError, type Adapter, type WalletName } from '@solana/wallet-adapter-base';
import { onMount, type Snippet } from 'svelte';
import getEnvironment, { Environment } from '../getEnvironment.js';
import getInferredChainFromEndpoint from '../getInferredClusterFromEndpoint.js';
import { useLocalStorage } from '../useLocalStorage.svelte.js';
import WalletProviderBase from './WalletProviderBase.svelte';
	import { useSolana } from '../useSolana.svelte.js';
	import type { PublicKey } from '@solana/web3.js';

let { children, wallets: adapters, autoConnect = false, localStorageKey = 'walletName', onerror, onconnect, ondisconnect }: {
children: Snippet;
/** The wallets to use, Usually you don't need to add these explicitly, all wallets supporting wallet standard will be auto detected */
wallets: Adapter[];
/** Whether to auto connect to the wallet after selecting wallet*/
autoConnect?: boolean | ((adapter: Adapter) => Promise<boolean>);
    /** You only need to change this if there's a conflict with context key */
localStorageKey?: string;
onerror?: (error: WalletError, adapter?: Adapter) => void;
onconnect?: (publicKey: PublicKey | null) => void;
ondisconnect?: () => void;
} = $props();

const userAgentString = (globalThis.navigator?.userAgent ?? null)
const AppIdentityUri = (globalThis.location ? `${globalThis.location.protocol}//${globalThis.location.host}` : undefined )
const {walletAdapters: adaptersWithStandardAdapters} = (useStandardWalletAdapters(adapters));
const isMobile = (getEnvironment({ adapters, userAgentString }) === Environment.MOBILE_WEB)
let error = $state<string>()

const {connection, context} = useSolana()

const mobileWalletAdapter = $derived.by(() => {
    if (!isMobile) {
        return null;
    }

    const existingMobileWalletAdapter = adaptersWithStandardAdapters.find(
        (adapter) => adapter.name === SolanaMobileWalletAdapterWalletName
    );

    if (existingMobileWalletAdapter) {
        return existingMobileWalletAdapter;
    }

    return new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
            uri: AppIdentityUri,
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: getInferredChainFromEndpoint(connection?.rpcEndpoint),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
});

const adaptersWithMobileWalletAdapter = $derived(
    (mobileWalletAdapter == null ? adaptersWithStandardAdapters : adaptersWithStandardAdapters.concat(mobileWalletAdapter))
)




const localStorage = (useLocalStorage(localStorageKey, isMobile ? SolanaMobileWalletAdapterWalletName : null));

let walletName = $state(localStorage.value);

const adapter = $derived(((mobileWalletAdapter == null || adaptersWithStandardAdapters.indexOf(mobileWalletAdapter) !== -1) 
        ? adaptersWithStandardAdapters 
        : adaptersWithStandardAdapters.concat(mobileWalletAdapter)).find((a) => a.name === walletName) ?? null
);

$effect(() => {
    context.adapters = adaptersWithMobileWalletAdapter
    context.selectedAdapter = adapter
    if (context.wallet) {
        context.wallet.selected = true
    }
})

async function changeWallet(nextWalletName: WalletName<string> | null) {
    if (walletName === nextWalletName) {
        return;
    }
    if (
        context.wallet &&
        // Selecting a wallet other than the mobile wallet adapter is not
        // sufficient reason to call `disconnect` on the mobile wallet adapter.
        // Calling `disconnect` on the mobile wallet adapter causes the entire
        // authorization store to be wiped.
        context.wallet.adapter.name !== SolanaMobileWalletAdapterWalletName
    ) {
        await context.wallet.disconnect();
    }
    walletName = nextWalletName;
}

$effect(() => {
    if (!adapter) {
        return;
    };
    const handleDisconnect = () => {
        if (context.isUnloading){
            return;
        };
        // Leave the adapter selected in the event of a disconnection.
        if (walletName === SolanaMobileWalletAdapterWalletName && isMobile) {
            return;
        }
        walletName = null;
    };
    adapter.on('disconnect', handleDisconnect);
    return () => {
        if (!adapter) {return};
        adapter.off('disconnect', handleDisconnect);
    };
});

let hasUserSelectedAWallet = $state(false);

const handleAutoConnectRequest = $derived(
    (!autoConnect || !adapter) ? undefined : async () => {
        // If autoConnect is true or returns true, use the default autoConnect behavior.
        if (autoConnect === true || (await autoConnect(adapter))) {
            if (hasUserSelectedAWallet) {
                try {
                if (!context.wallet) {
                    console.error('no wallet')
                    return 
                }
                await context.wallet.autoconnect()
                } catch (e) {
                    if (e instanceof Error) {
                        error = `If you see this error, you have probably not set up this wallet ${walletName} yet, ${e.message}`
                    }
                    console.error(e)
                } finally {
                    console.debug('auto connected adapter', adapter.name, 'connected public key', adapter.publicKey?.toString())
                }
            } else {
                await adapter.autoConnect();
            }
        }
    },
);

onMount(() => {
    if (walletName === SolanaMobileWalletAdapterWalletName && isMobile) {
        context.isUnloading = false;
        return;
    }
    return () => {
        
            context.isUnloading = true;
        
    };
});

function handleConnectError () {
    if (onerror) {
        onerror(new WalletError('Wallet connection error'))
    }
    if (adapter && adapter.name !== SolanaMobileWalletAdapterWalletName) {
        changeWallet(null);
    }
};

function selectWallet (walletName: WalletName | null) {
    hasUserSelectedAWallet = true
    changeWallet(walletName)
}

let status = $derived(context.wallet?.status ?? "disconnected")

</script>

<WalletProviderBase
    wallets={adaptersWithMobileWalletAdapter}
    onAutoConnectRequest={handleAutoConnectRequest}
    onConnectError={handleConnectError}
    {onerror}
    {onconnect}
    {ondisconnect}
    onSelectWallet={selectWallet}
>
    {@render children()}
</WalletProviderBase>