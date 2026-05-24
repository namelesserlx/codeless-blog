/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly BLOG_PUBLIC_URL?: string;
    readonly ADMIN_PUBLIC_URL?: string;
    readonly API_PUBLIC_URL?: string;
    readonly VITE_GITHUB_ID?: string;
    readonly VITE_GOOGLE_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*.less' {
    const classes: { [key: string]: string };
    export default classes;
}
