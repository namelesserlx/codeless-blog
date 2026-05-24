export interface RequestConfig extends RequestInit {
    skipAuth?: boolean; // 跳过认证
    skipErrorHandler?: boolean; // 跳过错误处理
}
