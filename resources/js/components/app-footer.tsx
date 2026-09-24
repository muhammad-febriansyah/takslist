import { Check } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { SiteSettings } from '@/types';

export function AppFooter() {
    const { siteSettings } = usePage<{ siteSettings: SiteSettings }>().props;
    const siteName = siteSettings?.site_name ?? 'TaskFlow';
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t border-[#e4eee9] bg-white/80">
            <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-3 px-4 py-5 text-xs text-[#71877b] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#e8f4ec] text-[#2d875c]">
                        <Check className="size-4 stroke-[3]" />
                    </span>
                    <div>
                        <p className="font-semibold text-[#315847]">{siteName}</p>
                        <p className="mt-0.5">Panel kerja internal</p>
                    </div>
                </div>
                <p>© {year} {siteName}. Semua hak dilindungi.</p>
            </div>
        </footer>
    );
}
