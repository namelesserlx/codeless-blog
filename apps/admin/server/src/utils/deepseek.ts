/**
 * DeepSeek API 工具函数
 */
import { env } from '../config/env';
import { BusinessError, ErrorCode, ValidationError } from '../types/errors';
import { logger } from './logger';

export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro';

export interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant'; // 角色
    content: string; // 内容
}

export interface DeepSeekCompletionOptions {
    model?: DeepSeekModel; // 模型名称
    messages: DeepSeekMessage[];
    max_tokens?: number; // 最大令牌数
    temperature?: number; // 温度
    top_p?: number; // 上采样
    frequency_penalty?: number; // 频率惩罚
    presence_penalty?: number; // 存在惩罚
    stop?: string[]; // 停止条件
}

export interface DeepSeekCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

class DeepSeekClient {
    private apiKey: string | undefined;
    private baseUrl: string;

    constructor() {
        this.apiKey = env.deepseek.apiKey;
        this.baseUrl = env.deepseek.baseUrl;

        if (!this.apiKey) {
            logger.warn('DeepSeek API Key 未配置，DeepSeek 功能将不可用');
        }
    }

    /**
     * 调用DeepSeek API
     */
    async createCompletion(
        options: DeepSeekCompletionOptions,
    ): Promise<DeepSeekCompletionResponse> {
        if (!this.apiKey) {
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, 'DeepSeek API Key 未配置');
        }

        const {
            model = 'deepseek-v4-flash',
            messages,
            max_tokens = 1000,
            temperature = 0.7,
            top_p = 1,
            frequency_penalty = 0,
            presence_penalty = 0,
            stop,
        } = options;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens,
                    temperature,
                    top_p,
                    frequency_penalty,
                    presence_penalty,
                    ...(stop && { stop }),
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new BusinessError(
                    ErrorCode.UNKNOWN_ERROR,
                    `DeepSeek API 请求失败: ${response.status} ${response.statusText} - ${errorText}`,
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('DeepSeek API 调用失败', error);

            if (error instanceof BusinessError) {
                throw error;
            }

            throw new BusinessError(
                ErrorCode.UNKNOWN_ERROR,
                error instanceof Error ? error.message : '调用DeepSeek API失败',
            );
        }
    }

    /**
     * 生成文本摘要
     */
    async generateSummary(
        content: string,
        model: DeepSeekModel = 'deepseek-v4-flash',
    ): Promise<string> {
        // 移除HTML标签和多余的空白字符
        const plainText = content
            .replace(/<[^>]*>/g, '') // 移除HTML标签
            .replace(/\s+/g, ' ') // 合并多个空白字符
            .trim();

        // 如果内容太短，直接返回原文
        if (plainText.length < 100) {
            return plainText.substring(0, 200) + '...';
        }

        const messages: DeepSeekMessage[] = [
            {
                role: 'system',
                content:
                    model === 'deepseek-v4-pro'
                        ? '你是一个专业的文章摘要生成助手。请仔细分析给定的文章内容，深入理解其核心观点和逻辑结构，然后生成一个简洁、准确的摘要。摘要应该：1. 概括文章的核心内容和主要观点；2. 长度控制在100-200字以内；3. 语言简洁明了；4. 保持客观中性的语调；5. 突出文章的独特价值和见解。直接返回摘要内容，不要添加任何额外的解释。'
                        : '你是一个专业的文章摘要生成助手。请为给定的文章内容生成一个简洁、准确的摘要。摘要应该：1. 概括文章的核心内容和主要观点；2. 长度控制在100-200字以内；3. 语言简洁明了；4. 保持客观中性的语调。直接返回摘要内容，不要添加任何额外的解释。',
            },
            {
                role: 'user',
                content: `请为以下文章生成摘要：\n\n${plainText}`,
            },
        ];

        const response = await this.createCompletion({
            model,
            messages,
            max_tokens: 300,
            temperature: model === 'deepseek-v4-pro' ? 0.3 : 0.7,
        });

        const summary = response.choices?.[0]?.message?.content?.trim();

        if (!summary) {
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, 'DeepSeek API 返回空摘要');
        }

        return summary;
    }

    /**
     * 生成文章标题
     */
    async generateTitle(
        content: string,
        model: DeepSeekModel = 'deepseek-v4-flash',
    ): Promise<string> {
        const plainText = content
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (plainText.length < 50) {
            throw new ValidationError('文章内容太短，无法生成标题');
        }

        const messages: DeepSeekMessage[] = [
            {
                role: 'system',
                content:
                    model === 'deepseek-v4-pro'
                        ? '你是一个专业的文章标题生成助手。请仔细分析文章内容，理解其核心主题和价值，然后生成一个吸引人的标题。标题应该：1. 准确反映文章核心内容；2. 具有吸引力和可读性；3. 长度控制在10-30字以内；4. 避免使用过于夸张的词汇。直接返回标题，不要添加引号或其他标点符号。'
                        : '你是一个专业的文章标题生成助手。请为给定的文章内容生成一个简洁、吸引人的标题。标题应该：1. 准确反映文章核心内容；2. 具有吸引力和可读性；3. 长度控制在10-30字以内；4. 避免使用过于夸张的词汇。直接返回标题，不要添加引号或其他标点符号。',
            },
            {
                role: 'user',
                content: `请为以下文章生成标题：\n\n${plainText.substring(0, 1000)}`,
            },
        ];

        const response = await this.createCompletion({
            model,
            messages,
            max_tokens: 50,
            temperature: model === 'deepseek-v4-pro' ? 0.3 : 0.7,
        });

        const title = response.choices?.[0]?.message?.content?.trim();

        if (!title) {
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, 'DeepSeek API 返回空标题');
        }

        return title;
    }

    /**
     * 生成文章标签
     */
    async generateTags(
        content: string,
        model: DeepSeekModel = 'deepseek-v4-flash',
    ): Promise<string[]> {
        const plainText = content
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (plainText.length < 50) {
            throw new ValidationError('文章内容太短，无法生成标签');
        }

        const messages: DeepSeekMessage[] = [
            {
                role: 'system',
                content:
                    model === 'deepseek-v4-pro'
                        ? '你是一个专业的文章标签生成助手。请仔细分析文章内容，理解其主题、技术栈、关键概念等，然后生成相关的标签。标签应该：1. 准确反映文章的技术内容和主题；2. 使用简洁的词汇，避免过长的短语；3. 生成3-8个标签；4. 标签之间用逗号分隔。直接返回标签列表，格式如：JavaScript,React,前端开发,性能优化'
                        : '你是一个专业的文章标签生成助手。请为给定的文章内容生成相关的标签。标签应该：1. 准确反映文章的技术内容和主题；2. 使用简洁的词汇，避免过长的短语；3. 生成3-8个标签；4. 标签之间用逗号分隔。直接返回标签列表，格式如：JavaScript,React,前端开发,性能优化',
            },
            {
                role: 'user',
                content: `请为以下文章生成标签：\n\n${plainText.substring(0, 1000)}`,
            },
        ];

        const response = await this.createCompletion({
            model,
            messages,
            max_tokens: 100,
            temperature: model === 'deepseek-v4-pro' ? 0.3 : 0.7,
        });

        const tagsText = response.choices?.[0]?.message?.content?.trim();

        if (!tagsText) {
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, 'DeepSeek API 返回空标签');
        }

        // 解析标签
        const tags = tagsText
            .split(/[,，、]/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .slice(0, 8); // 最多8个标签

        return tags;
    }

    /**
     * 检查API是否可用
     */
    async checkApiHealth(): Promise<boolean> {
        try {
            const response = await this.createCompletion({
                model: 'deepseek-v4-flash',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
            });
            return !!response.choices?.[0]?.message?.content;
        } catch (error) {
            logger.error('DeepSeek API 健康检查失败', error);
            return false;
        }
    }
}

// 创建单例实例
const deepSeekClient = new DeepSeekClient();

export default deepSeekClient;
