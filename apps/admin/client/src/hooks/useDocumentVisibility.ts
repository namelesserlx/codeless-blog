import { useEffect, useState } from 'react';

const getDocumentVisibility = (): boolean => {
    if (typeof document === 'undefined') {
        return true;
    }

    return document.visibilityState !== 'hidden';
};

export const useDocumentVisibility = (): boolean => {
    const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(getDocumentVisibility);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsDocumentVisible(getDocumentVisibility());
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isDocumentVisible;
};
