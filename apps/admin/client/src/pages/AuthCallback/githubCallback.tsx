import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { message, Spin } from 'antd';
import useUserStore from '@/stores/user';

function GithubCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const githubLogin = useUserStore((s) => s.githubLogin);
    const bindGithub = useUserStore((s) => s.bindGithub);
    const updateUserInfo = useUserStore((s) => s.updateUserInfo);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
            message.error('授权失败，未获取到授权码');
            navigate('/login');
            return;
        }

        const handleCallback = async () => {
            try {
                // 根据来源确定处理方式
                if (state === 'bind') {
                    await bindGithub(code);
                    await updateUserInfo({});
                    message.success('GitHub账号绑定成功');
                    navigate('/profile');
                } else {
                    await githubLogin(code);
                    message.success('GitHub登录成功');
                    navigate('/');
                }
            } catch (error: unknown) {
                message.error(error instanceof Error ? error.message : '第三方授权处理失败');
                navigate(state === 'bind' ? '/profile' : '/login');
            }
        };

        handleCallback();
    }, [bindGithub, githubLogin, navigate, searchParams, updateUserInfo]);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}
        >
            <Spin size="large" tip="正在处理第三方授权..." />
        </div>
    );
}

export default GithubCallback;
