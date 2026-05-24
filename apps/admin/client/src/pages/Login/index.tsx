import { Button, Form, Input, message, Divider } from 'antd';
import {
    UserOutlined,
    LockOutlined,
    SafetyOutlined,
    GithubOutlined,
    GoogleOutlined,
    EditOutlined,
    BookOutlined,
    HeartOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import useUserStore from '@/stores/user';
import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { clientEnv } from '@/config/env';
import { authService } from '@/services/auth';
import styles from './index.module.less';
import logo from '@/assets/logo.png';
interface LoginForm {
    username: string;
    password: string;
    captcha: string;
}

// 登录页面组件
export function Component() {
    const login = useUserStore((s) => s.login);
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [captchaUrl, setCaptchaUrl] = useState('');
    const [loading, setLoading] = useState(false);
    // 加载验证码
    const loadCaptcha = useCallback(async () => {
        try {
            const res = await authService.getCaptcha();
            if (res.code === 0) {
                // 将 SVG 字符串转换为 Data URL
                const svgBlob = new Blob([res.data], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);
                setCaptchaUrl((prevUrl) => {
                    if (prevUrl) {
                        URL.revokeObjectURL(prevUrl);
                    }
                    return url;
                });
            }
        } catch {
            message.error('获取验证码失败');
        }
    }, []);

    // 初始加载验证码
    useEffect(() => {
        loadCaptcha();
    }, [loadCaptcha]);

    useEffect(() => {
        return () => {
            if (captchaUrl) {
                URL.revokeObjectURL(captchaUrl);
            }
        };
    }, [captchaUrl]);

    const onFinish = async (values: LoginForm) => {
        try {
            setLoading(true);
            await login(values.username, values.password, values.captcha);
            message.success('登录成功');
            navigate('/dashboard');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '登录失败';
            message.error(errorMessage);
            if (errorMessage.includes('验证码')) {
                form.setFields([
                    {
                        name: 'captcha',
                        errors: ['验证码错误'],
                    },
                ]);
            } else {
                form.setFields([
                    {
                        name: 'password',
                        errors: ['用户名或密码错误'],
                    },
                ]);
            }
            // 刷新验证码
            loadCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = () => {
        const clientId = clientEnv.oauth.githubClientId;
        const redirectUri = clientEnv.oauth.githubCallbackUrl;
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user`;
        window.location.href = githubAuthUrl;
    };

    const handleGoogleLogin = () => {
        const clientId = clientEnv.oauth.googleClientId;
        const redirectUri = clientEnv.oauth.googleCallbackUrl;
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email&state=state_parameter_passthrough_value`;
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>
                {/* 左侧内容区 */}
                <div className={styles.leftSection}>
                    {/* Logo区域 */}
                    <div className={styles.logoSection}>
                        <div className={styles.logoIcon}>
                            <img src={logo} alt={"CodeLess's Blog"} />
                        </div>
                    </div>

                    <div className={styles.leftContent}>
                        <div className={styles.brand}>
                            <h1>{"CodeLess's"} Blog</h1>
                            <p>专注于技术分享与知识记录的个人博客管理系统</p>
                        </div>

                        <div className={styles.featureList}>
                            <div className={styles.featureItem}>
                                <EditOutlined className={styles.featureIcon} />
                                <span className={styles.featureText}>创作与分享技术文章</span>
                            </div>
                            <div className={styles.featureItem}>
                                <BookOutlined className={styles.featureIcon} />
                                <span className={styles.featureText}>记录学习心得与思考</span>
                            </div>
                            <div className={styles.featureItem}>
                                <HeartOutlined className={styles.featureIcon} />
                                <span className={styles.featureText}>收藏与整理知识片段</span>
                            </div>
                            <div className={styles.featureItem}>
                                <ShareAltOutlined className={styles.featureIcon} />
                                <span className={styles.featureText}>与开发者社区交流互动</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧登录区 */}
                <div className={styles.rightSection}>
                    <div className={styles.loginHeader}>
                        <h2>管理后台登录</h2>
                        <p>欢迎回来，请登录您的管理账户</p>
                    </div>

                    <Form form={form} onFinish={onFinish} className={styles.loginForm}>
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: '请输入用户名' }]}
                            className={styles.inputField}
                        >
                            <Input prefix={<UserOutlined />} size="large" placeholder="用户名" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: '请输入密码' }]}
                            className={styles.inputField}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                size="large"
                                placeholder="密码"
                            />
                        </Form.Item>

                        <Form.Item
                            name="captcha"
                            rules={[{ required: true, message: '请输入验证码' }]}
                            className={styles.inputField}
                        >
                            <div className={styles.captchaRow}>
                                <div className={styles.captchaInput}>
                                    <Input
                                        prefix={<SafetyOutlined />}
                                        size="large"
                                        placeholder="验证码"
                                    />
                                </div>
                                <img
                                    src={captchaUrl}
                                    alt="验证码"
                                    className={styles.captchaImage}
                                    onClick={loadCaptcha}
                                />
                            </div>
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                className={styles.loginButton}
                                loading={loading}
                            >
                                登录
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider className={styles.divider}>或使用第三方账号登录</Divider>

                    <div className={styles.socialLogin}>
                        <Button
                            type="default"
                            icon={<GithubOutlined className={styles.socialIcon} />}
                            size="large"
                            className={styles.socialButton}
                            onClick={handleGithubLogin}
                            block
                        >
                            GitHub登录
                        </Button>
                        <Button
                            type="default"
                            icon={<GoogleOutlined className={styles.socialIcon} />}
                            size="large"
                            className={styles.socialButton}
                            onClick={handleGoogleLogin}
                            block
                        >
                            Google登录
                        </Button>
                    </div>
                </div>
            </div>
            <div className={styles.footer}>
                <div>
                    © {new Date().getFullYear()} {"CodeLess's"} Blog - 分享技术，记录成长
                </div>
                <a
                    href="https://beian.miit.gov.cn"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.beianLink}
                >
                    粤ICP备XXXXXXXXXXXX号-XX
                </a>
            </div>
        </div>
    );
}
