import type { StorageProvider } from './types';
import { CosStorageProvider } from './cos-provider';

let _provider: StorageProvider;

export function getStorage(): StorageProvider {
    if (!_provider) {
        _provider = new CosStorageProvider();
    }
    return _provider;
}
