export interface PhotoModalData {
    id: number;
    src: string | string[];
    alt: string;
    title: string;
    description: string;
    location: string;
    date: string;
    tags: string[];
    category: string;
    createdAt?: string;
    initialImageIndex?: number;
    viewerKey?: string;
}

export interface PhotoModalProps {
    photo: PhotoModalData | null;
    isOpen: boolean;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}
