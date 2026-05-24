export interface ProfileUpdateData {
    username?: string;
    email?: string;
    avatar?: string;
}

export interface UserProfile {
    id: string;
    username: string;
    avatar?: string;
    email?: string;
    role: {
        name: string;
        code: string;
    };
}
