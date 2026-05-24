export enum PhotoCategory {
    SCENERY = 'SCENERY', // 风景
    ANIMAL = 'ANIMAL', // 动物
    PERSON = 'PERSON', // 人物
    BUILDING = 'BUILDING', // 建筑
    FOOD = 'FOOD', // 美食
    TRAVEL = 'TRAVEL', // 旅行
    DAILY = 'DAILY', // 日常
    TECHNOLOGY = 'TECHNOLOGY', // 科技
    SPORTS = 'SPORTS', // 运动
    OTHER = 'OTHER', // 其他
}

export const photoCategoryOptions = [
    { label: '风景', value: PhotoCategory.SCENERY },
    { label: '动物', value: PhotoCategory.ANIMAL },
    { label: '人物', value: PhotoCategory.PERSON },
    { label: '建筑', value: PhotoCategory.BUILDING },
    { label: '美食', value: PhotoCategory.FOOD },
    { label: '旅行', value: PhotoCategory.TRAVEL },
    { label: '日常', value: PhotoCategory.DAILY },
];

export interface Photo {
    id: number;
    src: string[]; // 统一返回数组格式，保持一致性
    alt: string;
    title: string;
    description: string;
    location: string;
    date: string;
    tags: string[];
    category: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PhotoListRequest {
    page?: number;
    pageSize?: number;
    title?: string;
    tags?: string[];
    category?: string;
    date?: [string, string];
}

export interface PhotoListResponse {
    list: Photo[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreatePhotoRequest {
    title: string;
    description: string;
    src: string[]; // 统一使用数组格式
    category: string;
    location: string;
    tags: string[];
    date: string;
}

export interface UpdatePhotoRequest extends Partial<CreatePhotoRequest> {
    id: number;
}

/**
 * 相册导出条目
 */
export interface PhotoExportItem extends CreatePhotoRequest {
    /**
     * 原始相册 ID（来自 Photo.id）
     */
    originalId: number;
    /**
     * 原始创建时间（ISO 字符串）
     */
    createdAt: string;
    /**
     * 原始更新时间（ISO 字符串）
     */
    updatedAt: string;
}

/**
 * 相册导出响应：直接返回导出条目数组
 */
export type PhotoExportResponse = PhotoExportItem[];

/**
 * 相册导入请求
 */
export interface PhotoImportRequest {
    photos: PhotoExportItem[];
}

/**
 * 单条相册导入结果
 */
export interface PhotoImportResultItem {
    originalId: number;
    newId?: number;
    title: string;
    success: boolean;
    errorMessage?: string;
}

/**
 * 相册导入响应
 */
export interface PhotoImportResponse {
    total: number;
    successCount: number;
    failCount: number;
    results: PhotoImportResultItem[];
}
