import { Spin } from 'antd';

export default function Loading() {
    return (
        <div className="global-spinner">
            <Spin size="large" />
        </div>
    );
}
