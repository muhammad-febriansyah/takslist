import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { SiteSettings } from '@/types';

export default function SiteMeta() {
    const { siteSettings } = usePage<{ siteSettings: SiteSettings }>().props;

    useEffect(() => {
        if (siteSettings?.site_name) {
            document.documentElement.dataset.siteName = siteSettings.site_name;
            const pageTitle = document.title.replace(/\s+-\s+(Laravel|TaskFlow|SageList)$/, '');
            document.title = `${pageTitle || siteSettings.site_name} - ${siteSettings.site_name}`;
        }
    }, [siteSettings?.site_name]);

    return (
        <Head>
            {siteSettings?.favicon_url && (
                <link rel="icon" type="image/png" href={siteSettings.favicon_url} />
            )}
            {siteSettings?.keyword && (
                <meta name="keywords" content={siteSettings.keyword} />
            )}
        </Head>
    );
}
