import { Link, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import SiteMeta from '@/components/site-meta';
import { home } from '@/routes';
import type { AuthLayoutProps, SiteSettings } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { siteSettings } = usePage<{ siteSettings: SiteSettings }>().props;
    const resolvedDescription = description?.replaceAll(
        'TaskFlow',
        siteSettings?.site_name ?? 'aplikasi',
    );

    return (
        <>
            <SiteMeta />
            <div
                className="relative min-h-svh overflow-hidden bg-[#fbfcfa] text-[#113524]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 8% 15%, rgba(213,229,218,.75) 0, rgba(213,229,218,.34) 15%, transparent 29%), radial-gradient(circle at 92% 10%, rgba(234,242,236,.9) 0, rgba(234,242,236,.45) 18%, transparent 34%), radial-gradient(circle at 8% 92%, rgba(234,242,236,.85) 0, rgba(234,242,236,.35) 17%, transparent 31%)',
                }}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(34,94,61,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(34,94,61,.025) 1px, transparent 1px)',
                        backgroundSize: '34px 34px',
                        maskImage:
                            'linear-gradient(to bottom, rgba(0,0,0,.45), transparent 75%)',
                    }}
                />

                <div className="pointer-events-none absolute top-14 left-16 hidden text-sm leading-6 text-[#225e3d]/70 xl:block">
                    <div className="mb-3 h-px w-7 bg-[#225e3d]/60" />
                    <p>Ruang kerja yang lebih teratur<br />untuk hari yang lebih baik.</p>
                </div>

                <div className="pointer-events-none absolute top-14 right-16 hidden items-center gap-3 text-[11px] font-medium tracking-wide text-[#225e3d]/60 xl:flex">
                    <span>KERJAKAN</span>
                    <span className="size-1 rounded-full bg-[#225e3d]/50" />
                    <span>RENCANAKAN</span>
                    <span className="size-1 rounded-full bg-[#225e3d]/50" />
                    <span>CAPAI</span>
                </div>

                <div className="pointer-events-none absolute top-1/2 left-[7%] hidden -translate-y-1/2 -rotate-6 lg:block">
                    <div className="w-60 rounded-3xl border border-[#eaf2ec] bg-white/80 p-6 shadow-[0_14px_35px_rgba(31,89,59,.1)] backdrop-blur">
                        <p className="mb-4 text-sm font-medium text-[#225e3d]">Hari ini</p>
                        <div className="grid gap-4 text-sm text-[#225e3d]/80">
                            {['Rencanakan pekerjaan', 'Bangun komponen UI', 'Review konten produk'].map((task, index) => (
                                <div key={task} className="flex items-center gap-3">
                                    <span className={`flex size-5 items-center justify-center rounded-md ${index < 2 ? 'bg-[#55906a] text-white' : 'border border-[#b6d1be] bg-white'}`}>
                                        {index < 2 && <Check className="size-3.5 stroke-[3]" />}
                                    </span>
                                    <span>{task}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute -right-24 top-[34%] hidden h-72 w-44 rotate-[28deg] rounded-[68%_32%_70%_30%] bg-[#719c68]/20 blur-[3px] xl:block">
                    <div className="absolute top-12 left-8 h-52 w-28 rotate-[-14deg] rounded-[70%_30%_68%_32%] bg-[#4f8058]/20 blur-[2px]" />
                </div>
                <div className="pointer-events-none absolute -bottom-24 left-[-3%] hidden h-64 w-40 rotate-[-38deg] rounded-[30%_70%_32%_68%] bg-[#6b9462]/20 blur-[3px] xl:block">
                    <div className="absolute top-8 left-16 h-48 w-24 rotate-[18deg] rounded-[28%_72%_30%_70%] bg-[#3e734c]/20 blur-[2px]" />
                </div>

                <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-10 md:px-8">
                    <section className="relative w-full max-w-[540px] rounded-[30px] border border-[#d5e5da]/80 bg-white/90 px-6 py-7 shadow-[0_24px_70px_rgba(31,89,59,.1)] backdrop-blur sm:px-9 sm:py-8">
                        <div className="pointer-events-none absolute -top-1 right-5 hidden items-center gap-4 rounded-2xl border border-[#eaf2ec] bg-white px-5 py-4 shadow-[0_14px_35px_rgba(31,89,59,.1)] sm:flex xl:-right-28 xl:top-8">
                            <div className="flex items-end gap-1">
                                <span className="h-4 w-1.5 rounded-full bg-[#83af91]" />
                                <span className="h-7 w-1.5 rounded-full bg-[#36764f]" />
                                <span className="h-5 w-1.5 rounded-full bg-[#55906a]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#113524]">3 dari 8 selesai</p>
                                <p className="text-xs text-[#225e3d]/60">Tugas minggu ini</p>
                            </div>
                            <ChevronRight className="size-5 text-[#19472f]" />
                        </div>

                        <Link href={home()} className="mb-6 flex items-center justify-center" aria-label="Beranda">
                            {siteSettings?.logo_url ? (
                                <img src={siteSettings.logo_url} alt="" className="h-[84px] max-w-[300px] object-contain" />
                            ) : (
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#225e3d] text-white shadow-sm">
                                    <Check className="size-7 stroke-[2.2]" />
                                </span>
                            )}
                        </Link>

                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-semibold tracking-[-.04em] text-[#113524] sm:text-3xl">{title}</h1>
                            <p className="mt-2 text-sm leading-6 text-[#225e3d]/60">{resolvedDescription}</p>
                        </div>

                        {children}
                    </section>
                </main>

                <div className="pointer-events-none absolute right-[10%] top-[58%] hidden -translate-y-1/2 rotate-[-5deg] text-center text-[#225e3d]/55 xl:block">
                    <p className="text-lg font-medium leading-7">Langkah kecil,<br />hasil besar.</p>
                    <Sparkles className="mx-auto mt-2 size-7" />
                </div>

                <div className="pointer-events-none absolute bottom-12 left-16 hidden text-xs leading-5 text-[#225e3d]/55 xl:block">
                    <div className="mb-3 h-px w-7 bg-[#225e3d]/45" />
                    <p>Fokus kecil setiap hari,<br />progres besar setiap minggu.</p>
                </div>
            </div>
        </>
    );
}
