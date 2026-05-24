declare module 'jszip' {
    export interface JSZipFileOptions {
        binary?: boolean;
        base64?: boolean;
        compression?: 'STORE' | 'DEFLATE';
        comment?: string;
        date?: Date;
        createFolders?: boolean;
    }

    export interface JSZipGenerateOptions {
        type: 'blob' | 'base64' | 'arraybuffer' | 'uint8array' | 'nodebuffer';
        compression?: 'STORE' | 'DEFLATE';
        compressionOptions?: {
            level?: number;
        };
    }

    export interface JSZip {
        file(
            path: string,
            data: string | ArrayBuffer | Uint8Array | Blob,
            options?: JSZipFileOptions,
        ): JSZip;

        generateAsync(options: JSZipGenerateOptions): Promise<Blob>;
    }

    const JSZipConstructor: {
        new (): JSZip;
    };

    export default JSZipConstructor;
}
