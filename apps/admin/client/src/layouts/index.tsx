import { Layout } from 'antd';
import { Outlet } from 'react-router';
import BasicHeader from './Header';
import BasicSider from './Sider';
import BasicFooter from './Footer';
import { useCallback, useState } from 'react';

const { Content } = Layout;

function BasicLayout() {
    const [collapsed, setCollapsed] = useState(false);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []);

    return (
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
            <BasicSider collapsed={collapsed} />
            <Layout style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <BasicHeader collapsed={collapsed} onToggle={toggleCollapsed} />
                <Content
                    style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#F3F6FD',
                        boxSizing: 'border-box',
                        overflowY: 'auto',
                    }}
                >
                    <div style={{ width: '100%' }}>
                        <Outlet />
                    </div>
                </Content>
                <BasicFooter />
            </Layout>
        </Layout>
    );
}

export default BasicLayout;
