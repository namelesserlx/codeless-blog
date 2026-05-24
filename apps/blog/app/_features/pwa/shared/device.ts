export function isIOSDevice(userAgent: string) {
    return /iPad|iPhone|iPod/.test(userAgent);
}
