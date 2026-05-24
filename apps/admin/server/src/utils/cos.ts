import { cos, COS_CONFIG } from '../config/cos';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
    /** 上传到的文件夹路径，如 'images', 'documents/pdf' */
    folder?: string;
    /** 缓存控制策略，如 'max-age=31536000' */
    cacheControl?: string;
    /** 内容类型，如 'image/jpeg' */
    contentType?: string;
}

export class CosUtil {
    /**
     * 上传文件到COS
     * @param file 文件Buffer
     * @param fileName 文件名
     * @param options 上传选项
     * @returns 文件访问URL
     */
    static async uploadFile(
        file: Buffer,
        fileName: string,
        options: UploadOptions = {},
    ): Promise<string> {
        const { folder, cacheControl, contentType } = options;

        // 构建文件路径
        const fileKey = folder ? `${folder}/${uuidv4()}-${fileName}` : `${uuidv4()}-${fileName}`;

        // 构建上传参数
        const uploadParams: any = {
            Bucket: COS_CONFIG.Bucket,
            Region: COS_CONFIG.Region,
            Key: fileKey,
            Body: file,
        };

        // 设置缓存控制
        if (cacheControl) {
            uploadParams.CacheControl = cacheControl;
        }

        // 设置内容类型
        if (contentType) {
            uploadParams.ContentType = contentType;
        }

        return new Promise((resolve, reject) => {
            cos.putObject(uploadParams, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    if (COS_CONFIG.customDomain) {
                        resolve(`${COS_CONFIG.customDomain}/${fileKey}`);
                    } else {
                        resolve(
                            `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${fileKey}`,
                        );
                    }
                }
            });
        });
    }

    /**
     * 根据文件扩展名获取内容类型
     * @param fileName 文件名
     * @returns 内容类型
     */
    static getContentType(fileName: string): string {
        const ext = fileName.toLowerCase().split('.').pop() || '';

        const contentTypes: Record<string, string> = {
            // 图片
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',

            // 文档
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            // 音视频
            mp3: 'audio/mpeg',
            mp4: 'video/mp4',
            avi: 'video/x-msvideo',
            mov: 'video/quicktime',

            // 文本
            txt: 'text/plain',
            css: 'text/css',
            js: 'application/javascript',
            json: 'application/json',
            xml: 'application/xml',

            // 压缩包
            zip: 'application/zip',
            rar: 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
        };

        return contentTypes[ext] || 'application/octet-stream';
    }

    /**
     * 获取预定义的缓存策略
     */
    static getCacheControl(
        type: 'image' | 'document' | 'video' | 'static' | 'dynamic' = 'static',
    ): string {
        const cacheStrategies: Record<string, string> = {
            image: 'public, max-age=31536000, immutable', // 1年，图片通常不变
            document: 'max-age=86400', // 1天，文档可能会更新
            video: 'max-age=2592000', // 30天，视频文件较大但不常变
            static: 'max-age=31536000', // 1年，静态资源
            dynamic: 'max-age=3600, must-revalidate', // 1小时，动态内容
        };

        return cacheStrategies[type];
    }

    static async deleteFile(fileUrl: string): Promise<void> {
        // 提取文件key，支持带文件夹路径的URL
        const urlParts = fileUrl.split('/');
        const domainIndex = urlParts.findIndex(
            (part) =>
                part.includes('.cos.') ||
                part.includes('.myqcloud.com') ||
                part === COS_CONFIG.customDomain?.replace('https://', '').replace('http://', ''),
        );

        const fileKey =
            domainIndex !== -1 ? urlParts.slice(domainIndex + 1).join('/') : urlParts.pop() || '';

        return new Promise((resolve, reject) => {
            cos.deleteObject(
                {
                    Bucket: COS_CONFIG.Bucket,
                    Region: COS_CONFIG.Region,
                    Key: fileKey,
                },
                (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                },
            );
        });
    }
}
