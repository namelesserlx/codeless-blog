import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
// 引入时区插件
import timezone from 'dayjs/plugin/timezone';
// 引入时区数据（包含 Asia/Shanghai 等时区）
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(timezone);
// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 日志工具类
 */
class Logger {
    private formatArgs(args: unknown[]): string {
        if (args.length === 0) {
            return '';
        }

        return args
            .map((arg) => {
                if (arg instanceof Error) {
                    return arg.stack || arg.message;
                }
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        try {
                            const safeObj: Record<string, unknown> = {};
                            Object.keys(arg).forEach((key) => {
                                const value = (arg as Record<string, unknown>)[key];
                                if (typeof value === 'function') {
                                    safeObj[key] = '[Function]';
                                } else if (typeof value === 'object' && value !== null) {
                                    safeObj[key] = value.toString();
                                } else {
                                    safeObj[key] = value;
                                }
                            });
                            return JSON.stringify(safeObj, null, 2);
                        } catch (fallbackError) {
                            return `[Object: ${Object.prototype.toString.call(arg)}]`;
                        }
                    }
                }
                if (arg === null) {
                    return 'null';
                }
                if (arg === undefined) {
                    return 'undefined';
                }
                return String(arg);
            })
            .join(' ');
    }

    private getConsoleMethod(level: string) {
        if (level === 'ERROR') {
            return console.error;
        }

        if (level === 'WARN') {
            return console.warn;
        }

        return console.log;
    }

    private logToFile(level: string, message: string, ...args: unknown[]): void {
        // 使用 Intl.DateTimeFormat 格式化为北京时间
        const now = dayjs.tz(new Date(), 'Asia/Shanghai');
        const date = now.format('YYYY-MM-DD');
        const time = now.format('HH:mm:ss');
        const logFile = path.join(logDir, `${date}.log`);

        const formattedArgs = this.formatArgs(args);

        // 构建日志消息
        const logMessage = `[${date} ${time}] [${level}] ${message} ${formattedArgs}\n`;

        void fs.promises.appendFile(logFile, logMessage).catch((error) => {
            console.error('[LOGGER] 日志文件写入失败', error);
        });

        this.getConsoleMethod(level)(`[${level}] ${message}`, ...args);
    }

    /**
     * 记录调试级别日志
     */
    public debug(message: string, ...args: unknown[]): void {
        this.logToFile('DEBUG', message, ...args);
    }

    /**
     * 记录信息级别日志
     */
    public info(message: string, ...args: unknown[]): void {
        this.logToFile('INFO', message, ...args);
    }

    /**
     * 记录警告级别日志
     */
    public warn(message: string, ...args: unknown[]): void {
        this.logToFile('WARN', message, ...args);
    }

    /**
     * 记录错误级别日志
     */
    public error(message: string, ...args: unknown[]): void {
        this.logToFile('ERROR', message, ...args);
    }
}

// 导出单例实例
export const logger = new Logger();
