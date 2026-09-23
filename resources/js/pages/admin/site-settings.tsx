import { Form, Head, usePage } from '@inertiajs/react';
import { ImagePlus, Lightbulb, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { update } from '@/routes/site-settings';
import type { SiteSettings } from '@/types';

type Props = {
    settings: SiteSettings;
};

export default function SiteSettingsPage({ settings }: Props) {
    const { name } = usePage().props;
    const [siteName, setSiteName] = useState(settings.site_name);
    const [keyword, setKeyword] = useState(settings.keyword);
    const [tagline, setTagline] = useState(settings.tagline ?? '');
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo_url);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(settings.favicon_url);

    useEffect(() => () => {
        [logoPreview, faviconPreview].forEach((preview) => {
            if (preview?.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        });
    }, [faviconPreview, logoPreview]);

    return (
        <>
            <Head title="Pengaturan website" />
            <div className="grid gap-8 pt-6 sm:pt-8 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section>
                    <div className="mb-7">
                        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">ADMIN / BRANDING</p>
                        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30]">Pengaturan website</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f978d]">Atur identitas TaskFlow. Perubahan langsung dipakai pada header dan halaman publik.</p>
                    </div>

                    <Form {...update.form()} options={{ preserveScroll: true }} className="rounded-3xl border border-[#e1eee7] bg-white p-5 shadow-[0_6px_18px_rgba(32,83,57,0.04)] sm:p-7">
                        {({ processing, errors }) => (
                            <div className="space-y-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="site_name">Nama website</Label>
                                        <Input id="site_name" name="site_name" value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="TaskFlow" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                        <InputError message={errors.site_name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="keyword">Keyword</Label>
                                        <Input id="keyword" name="keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="manajemen task" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                        <InputError message={errors.keyword} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="tagline">Tagline / deskripsi singkat</Label>
                                    <textarea id="tagline" name="tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} placeholder="Ruang kerja yang lebih teratur." className="min-h-28 w-full rounded-2xl border border-[#d9e9df] bg-[#fbfdfb] px-3 py-3 text-sm text-[#315847] outline-none transition focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]" />
                                    <InputError message={errors.tagline} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="logo">Logo PNG</Label>
                                    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#b9d8c4] bg-[#f5fbf7] p-4 transition-colors hover:bg-[#edf8f0]">
                                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-[#3b9362] shadow-sm">
                                            {logoPreview ? <img src={logoPreview} alt="" className="size-full object-contain p-1.5" /> : <ImagePlus className="size-5" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-[#315847]">Pilih logo PNG</span>
                                            <span className="mt-1 block text-xs text-[#8aa097]">Maksimal 2 MB · transparan disarankan</span>
                                        </span>
                                        <input id="logo" name="logo" type="file" accept="image/png" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                setLogoPreview(URL.createObjectURL(file));
                                            }
                                        }} />
                                    </label>
                                    <InputError message={errors.logo} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="favicon">Favicon PNG</Label>
                                    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#b9d8c4] bg-[#f5fbf7] p-4 transition-colors hover:bg-[#edf8f0]">
                                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-[#3b9362] shadow-sm">
                                            {faviconPreview ? <img src={faviconPreview} alt="" className="size-full object-contain p-2" /> : <Sparkles className="size-5" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-[#315847]">Pilih favicon PNG</span>
                                            <span className="mt-1 block text-xs text-[#8aa097]">Maksimal 1 MB · dipakai pada tab browser</span>
                                        </span>
                                        <input id="favicon" name="favicon" type="file" accept="image/png" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                setFaviconPreview(URL.createObjectURL(file));
                                            }
                                        }} />
                                    </label>
                                    <InputError message={errors.favicon} />
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-[#edf3ef] pt-5">
                                    <p className="flex items-center gap-2 text-xs leading-5 text-[#8aa097]"><Lightbulb className="size-4 shrink-0 text-[#d79c26]" />Preview mengikuti input secara langsung.</p>
                                    <Button type="submit" disabled={processing} className="h-11 rounded-full bg-[#2d8b60] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(45,139,96,0.2)] hover:bg-[#247850]">
                                        <Save className="size-4" />
                                        {processing ? 'Menyimpan...' : 'Simpan perubahan'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                </section>

                <aside className="xl:pt-[82px]">
                    <div className="sticky top-24 overflow-hidden rounded-[28px] border border-[#dcece2] bg-[#f2f9f4] shadow-[0_24px_70px_rgba(32,83,57,0.08)]">
                        <div className="flex items-center justify-between border-b border-[#dcece2] bg-white/70 px-5 py-4">
                            <div>
                                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#5c8d70] uppercase">Live preview</p>
                                <p className="mt-1 text-xs text-[#92a79b]">Tampilan identitas website</p>
                            </div>
                            <Sparkles className="size-4 text-[#3d9664]" />
                        </div>
                        <div className="p-5">
                            <div className="overflow-hidden rounded-[22px] border border-[#e0ece4] bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#edf3ef] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={'flex size-9 items-center justify-center overflow-hidden ' + (logoPreview ? 'rounded-none bg-transparent' : 'rounded-lg bg-[#2d875c] text-white')}>
                                            {logoPreview ? <img src={logoPreview} alt="" className="size-full object-contain" /> : <Sparkles className="size-3.5" />}
                                        </div>
                                        <span className="text-sm font-bold tracking-[-0.04em] text-[#173d30]">{siteName || String(name)}</span>
                                    </div>
                                    <span className="rounded-full bg-[#eaf5ed] px-2 py-1 text-[9px] font-semibold text-[#3c855b]">Preview</span>
                                </div>
                                <div className="space-y-5 p-5">
                                    <div className="rounded-2xl bg-[#eaf6ee] p-4">
                                        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#4b956d] uppercase">{keyword || 'keyword website'}</p>
                                        <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-[-0.06em] text-[#173d30]">{siteName || 'Nama website'}</h2>
                                        <p className="mt-2 text-xs leading-5 text-[#6f887c]">{tagline || 'Tagline website tampil di sini.'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl border border-[#e3eee7] p-3"><div className="mb-3 h-2 w-12 rounded-full bg-[#dcece2]" /><div className="h-8 rounded-xl bg-[#f1f7f3]" /></div>
                                        <div className="rounded-2xl border border-[#e3eee7] p-3"><div className="mb-3 h-2 w-16 rounded-full bg-[#dcece2]" /><div className="h-8 rounded-xl bg-[#f1f7f3]" /></div>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-center text-xs leading-5 text-[#7f978d]">Preview mengikuti sistem light mode, Poppins, dan aksen hijau TaskFlow.</p>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}
