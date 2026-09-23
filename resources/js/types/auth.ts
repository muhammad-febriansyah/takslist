export type User = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'atasan' | 'bawahan';
    supervisor_id?: number | null;
    is_active: boolean;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type SiteSettings = {
    site_name: string;
    keyword: string;
    tagline: string | null;
    logo_url: string | null;
    favicon_url: string | null;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
