import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { message, Spin } from 'antd';
import useUserStore from '@/stores/user';

function GoogleCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const googleLogin = useUserStore((state) => state.googleLogin);
    const bindGoogle = useUserStore((state) => state.bindGoogle);
    const updateUserInfo = useUserStore((state) => state.updateUserInfo);
    const handledRef = useRef(false);
    const code = useMemo(() => searchParams.get('code'), [searchParams]);
    const state = useMemo(() => searchParams.get('state'), [searchParams]);

    useEffect(() => {
        if (handledRef.current) return;
        handledRef.current = true;

        if (!code) {
            message.error('授权失败，未获取到授权码');
            navigate('/login', { replace: true });
            return;
        }

        const handleCallback = async () => {
            try {
                // 如果是绑定操作
                if (state === 'bind') {
                    await bindGoogle(code);
                    await updateUserInfo({});
                    message.success('Google账号绑定成功');
                    navigate('/profile', { replace: true });
                } else {
                    // 否则是登录操作
                    await googleLogin(code);
                    message.success('Google登录成功');
                    navigate('/dashboard', { replace: true });
                }
            } catch (error: unknown) {
                message.error(error instanceof Error ? error.message : 'Google授权处理失败');
                navigate(state === 'bind' ? '/profile' : '/login', { replace: true });
            }
        };

        handleCallback();
    }, [bindGoogle, code, googleLogin, navigate, state, updateUserInfo]);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}
        >
            <Spin size="large" tip="正在处理Google授权..." />
        </div>
    );
}

export default GoogleCallback;
