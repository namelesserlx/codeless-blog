import COS from 'cos-nodejs-sdk-v5';
import { logger } from '../utils/logger';
import { env } from './env';

export const cos = new COS({
    SecretId: env.cos.secretId,
    SecretKey: env.cos.secretKey,
});

export const COS_CONFIG = {
    Bucket: env.cos.bucket,
    Region: env.cos.region,
    SliceSize: env.cos.sliceSize,
    customDomain: env.cos.customDomain,
};

export function validateCosConfig(): boolean {
    const missing = [
        ['COS_SECRET_ID', env.cos.secretId],
        ['COS_SECRET_KEY', env.cos.secretKey],
        ['COS_BUCKET', env.cos.bucket],
        ['COS_REGION', env.cos.region],
    ]
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        logger.warn('对象存储配置不完整，上传能力将不可用', {
            missing,
        });
        return false;
    }

    return true;
}
