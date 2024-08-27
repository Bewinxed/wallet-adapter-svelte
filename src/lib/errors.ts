import { WalletError } from '@bewinxed/wallet-adapter-base';

export class WalletNotSelectedError extends WalletError {
	name = 'WalletNotSelectedError';
}
