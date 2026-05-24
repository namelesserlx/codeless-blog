import { v4 as uuidv4 } from 'uuid';
import { cos, COS_CONFIG } from '../../config/cos';
import type { StorageProvider, UploadParams, FileCategory } from './types';
import { CATEGORY_DIR } from './types';

function getContentType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const map: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        mp3: 'audio/mpeg',
        mp4: 'video/mp4',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',
        txt: 'text/plain',
        css: 'text/css',
        js: 'application/javascript',
        json: 'application/json',
        xml: 'application/xml',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
    };
    return map[ext] || 'application/octet-stream';
}

function getCacheControl(category: FileCategory): string {
    const strategies: Record<FileCategory, string> = {
        image: 'public, max-age=31536000, immutable',
        video: 'max-age=2592000',
        other: 'max-age=86400',
    };
    return strategies[category];
}

function buildFileKey(params: UploadParams): string {
    const dir = CATEGORY_DIR[params.category];
    return `${params.entityType}/${params.entityId}/${dir}/${uuidv4()}-${params.originalName}`;
}

function buildUrl(fileKey: string): string {
    if (COS_CONFIG.customDomain) {
        return `${COS_CONFIG.customDomain}/${fileKey}`;
    }
    return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${fileKey}`;
}

function parseHost(domain: string): string {
    if (!domain) return '';
    try {
        const normalized = /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
        return new URL(normalized).host;
    } catch {
        return '';
    }
}

function extractFileKey(fileUrl: string): string | null {
    try {
        const url = new URL(fileUrl);
        const defaultHost = `${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com`;
        const customHost = parseHost(COS_CONFIG.customDomain);
        const isStorageUrl = url.host === defaultHost || (customHost && url.host === customHost);

        if (!isStorageUrl) {
            return null;
        }

        return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
        return null;
    }
}

export class CosStorageProvider implements StorageProvider {
    async upload(params: UploadParams): Promise<string> {
        const fileKey = buildFileKey(params);
        const contentType = params.mimeType || getContentType(params.originalName);
        const cacheControl = getCacheControl(params.category);

        return new Promise((resolve, reject) => {
            cos.putObject(
                {
                    Bucket: COS_CONFIG.Bucket,
                    Region: COS_CONFIG.Region,
                    Key: fileKey,
                    Body: params.buffer,
                    ContentType: contentType,
                    CacheControl: cacheControl,
                },
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buildUrl(fileKey));
                    }
                },
            );
        });
    }

    async delete(fileUrl: string): Promise<void> {
        const fileKey = extractFileKey(fileUrl);
        if (!fileKey) return;

        return new Promise((resolve, reject) => {
            cos.deleteObject(
                {
                    Bucket: COS_CONFIG.Bucket,
                    Region: COS_CONFIG.Region,
                    Key: fileKey,
                },
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                },
            );
        });
    }

    getUrl(fileKey: string): string {
        return buildUrl(fileKey);
    }
}
