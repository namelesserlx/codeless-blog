import './photos.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '时光相册 - 个人博客',
    description:
        '记录生活中的美好瞬间，分享摄影作品和旅行回忆。浏览精选照片集，涵盖风景、建筑、美食、旅行等多个分类。',
    keywords: '摄影, 相册, 时光, 回忆, 旅行, 风景摄影, 建筑摄影, 美食摄影, 个人博客',
    authors: [{ name: 'CodeLess' }],
    creator: 'CodeLess',
    publisher: 'CodeLess',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    alternates: {
        canonical: '/photos',
    },
};

export default function PhotosLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
