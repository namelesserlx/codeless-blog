import { UAParser } from 'ua-parser-js';

/**
 * 判断是否为ip格式
 * @param ip
 * @returns
 */
function isIPAddress(ip: string): boolean {
    // 正则表达式匹配 IPv4 地址
    const ipv4Pattern =
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // 正则表达式匹配 IPv6 地址
    const ipv6Pattern =
        /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;

    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * 判断是否为内网IP地址
 * @param ip
 * @returns
 */
function isPrivateIP(ip: string): boolean {
    // 本地回环地址
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('127.')) {
        return true;
    }

    // IPv6本地回环
    if (ip === '::1') {
        return true;
    }

    // 解析IPv4地址
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipv4Regex);

    if (!match) {
        return false; // 不是有效的IPv4地址
    }

    const [, a, b] = match.map(Number);

    // 检查是否在内网范围内
    return (
        // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
        a === 10 ||
        // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
        (a === 172 && b >= 16 && b <= 31) ||
        // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
        (a === 192 && b === 168) ||
        // 169.254.0.0/16 (169.254.0.0 - 169.254.255.255) - 链路本地地址
        (a === 169 && b === 254)
    );
}

/**
 * 获取访问用户真实IP
 * @param ctx
 */
export const getUserIp = (ctx: any) => {
    // 优先从代理头获取真实IP
    const forwardedFor = ctx.request.headers['x-forwarded-for'];
    const realIp = ctx.request.headers['x-real-ip'];
    const clientIp = ctx.request.headers['x-client-ip'];

    // 如果有 x-forwarded-for，取第一个IP
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
        const validIp = ips.find((ip: string) => isIPAddress(ip));
        if (validIp) return validIp;
    }

    // 如果有 x-real-ip
    if (realIp && isIPAddress(realIp)) {
        return realIp;
    }

    // 如果有 x-client-ip
    if (clientIp && isIPAddress(clientIp)) {
        return clientIp;
    }

    // 最后使用 ctx.request.ip
    let ip = ctx.request.ip || ctx.ip || '127.0.0.1';

    // 处理IPv6映射的IPv4地址 (::ffff:192.168.1.1)
    if (ip.includes('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    // 处理IPv6本地回环地址
    if (ip === '::1') {
        ip = '127.0.0.1';
    }

    // 如果是端口格式 (192.168.1.1:3000)，只取IP部分
    if (ip.includes(':') && !ip.includes('::')) {
        const parts = ip.split(':');
        if (parts.length === 2 && isIPAddress(parts[0])) {
            ip = parts[0];
        }
    }

    return ip;
};

/**
 * 查询地址
 * @param ip
 */
export const queryIpAdress = async (ip: string) => {
    if (!isIPAddress(ip)) {
        return '未知ip';
    }

    if (isPrivateIP(ip)) {
        return '内网地址';
    }

    return '未知ip';
};

/**
 * 同步获取用户机器信息快照，不等待公网地址解析。
 * 公网 IP 的地址可以在登录后异步补全，避免阻塞登录响应。
 */
export const getUserMachineSnapshot = (ctx: any) => {
    const ip = getUserIp(ctx);
    let address = '查询中';

    if (!isIPAddress(ip)) {
        address = '未知ip';
    } else if (isPrivateIP(ip)) {
        address = '内网地址';
    }

    // 解析用户代理
    const userAgent = ctx.request.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // 浏览器信息
    const browser = result.browser.name
        ? `${result.browser.name} ${result.browser.version?.split('.')[0] || ''}`
        : '未知浏览器';

    // 操作系统信息
    const os = result.os.name
        ? `${result.os.name} ${result.os.version?.split('.')[0] || ''}`
        : '未知系统';

    return {
        ip,
        address,
        browser,
        os,
    };
};

/**
 * 获取用户 ip 、地址、浏览器、操作系统信息
 * @param ctx koa请求信息
 * @returns {ip,address,browser,os}
 */
export const queryUserMachine = async (ctx: any) => {
    return getUserMachineSnapshot(ctx);
};
