import type { Auth, SiteSettings } from '@/types/auth';
import type { NotificationItem } from '@/types/ui';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            siteSettings: SiteSettings;
            notifications: NotificationItem[];
            [key: string]: unknown;
        };
    }
}
