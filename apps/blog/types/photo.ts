export interface PhotoRecord {
    id: number;
    src: string[];
    alt: string;
    title: string;
    description: string;
    location: string;
    date: string;
    tags: string[];
    category: string;
    createdAt: string;
    updatedAt?: string;
}
