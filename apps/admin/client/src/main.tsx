import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import NiceModal from '@ebay/nice-modal-react';
import useUserStore from '@/stores/user';
import routes from '@/routes/index';
import { bootstrapAuth } from '@/session/bootstrapAuth';

const root = ReactDOM.createRoot(document.getElementById('root')!);
type AppRouter = ReturnType<typeof createBrowserRouter>;

export const RouterRoot = ({ router }: { router: AppRouter }) => {
    return <RouterProvider router={router} />;
};

export const AppShell = ({ router }: { router: AppRouter }) => {
    const initUserInfo = useUserStore((state) => state.initUserInfo);

    useEffect(() => {
        initUserInfo();
    }, [initUserInfo]);

    return (
        <ConfigProvider locale={zhCN}>
            <NiceModal.Provider>
                <RouterRoot router={router} />
            </NiceModal.Provider>
        </ConfigProvider>
    );
};

const bootstrapAndRender = async () => {
    // 在应用渲染前，尽早同步一次浏览器环境中的登录态（URL 查询参数 / Cookie / sid 会话）
    await bootstrapAuth();
    const router = createBrowserRouter(routes);
    root.render(<AppShell router={router} />);
};

void bootstrapAndRender();
