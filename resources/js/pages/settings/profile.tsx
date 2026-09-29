import { Form, Head, usePage } from '@inertiajs/react';
import { Camera, Check, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    passwordRules: string;
};

const roleLabels: Record<Auth['user']['role'], string> = {
    admin: 'Administrator',
    atasan: 'Atasan',
    bawahan: 'Bawahan',
};

export default function Profile() {
    const { auth, passwordRules } = usePage<PageProps>().props;
    const getInitials = useInitials();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(auth.user.avatar ?? null);

    useEffect(() => () => {
        if (avatarPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }
    }, [avatarPreview]);

    function handleAvatarChange(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];

        if (file) {
            setAvatarPreview(URL.createObjectURL(file));
        }
    }

    return (
        <>
            <Head title="Profil" />

            <div className="space-y-8">
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">AKUN / PROFIL</p>
                    <Heading
                        title="Profil"
                        description="Kelola informasi akun, foto profil, dan kata sandimu."
                    />
                </div>

                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <section className="rounded-[28px] border border-[#e8f0eb] bg-white p-5 shadow-none sm:p-7">
                        <div className="mb-7 flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#eaf6ee] text-[#2d8b60]"><UserRound className="size-5" /></span>
                            <div>
                                <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173d30]">Informasi profil</h2>
                                <p className="mt-1 text-xs text-[#8aa097]">Data ini tampil pada akun dan pengajuan timesheet.</p>
                            </div>
                        </div>

                        <Form
                            {...ProfileController.update.form()}
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#b9d8c4] bg-[#f5fbf7] p-4 sm:flex-row sm:items-center">
                                        <Avatar className="size-20 shrink-0 rounded-3xl ring-4 ring-white">
                                            <AvatarImage src={avatarPreview ?? undefined} alt={auth.user.name} />
                                            <AvatarFallback className="rounded-3xl bg-[#dcefe4] text-lg font-semibold text-[#256b45]">{getInitials(auth.user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[#315847]">Foto profil</p>
                                            <p className="mt-1 text-xs leading-5 text-[#8aa097]">JPG, PNG, atau WEBP. Maksimal 2 MB.</p>
                                        </div>
                                        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#cfe4d5] bg-white px-4 text-xs font-semibold text-[#347b56] transition hover:bg-[#edf8f0]">
                                            <Camera className="size-4" />
                                            Ganti avatar
                                            <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} />
                                        </label>
                                    </div>
                                    <InputError message={errors.avatar} />

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name" className="text-[#315847]">Nama lengkap</Label>
                                            <Input id="name" name="name" defaultValue={auth.user.name} required autoComplete="name" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email" className="text-[#315847]">Email</Label>
                                            <Input id="email" name="email" type="email" defaultValue={auth.user.email} required autoComplete="email" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                            <InputError message={errors.email} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="role">Peran</Label>
                                            <Input id="role" value={roleLabels[auth.user.role]} readOnly className="h-12 rounded-2xl border-[#e5eee8] bg-[#f5f9f6] text-[#8aa097]" />
                                        </div>
                                        {auth.user.position && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="position">Jabatan</Label>
                                                <Input id="position" value={auth.user.position} readOnly className="h-12 rounded-2xl border-[#e5eee8] bg-[#f5f9f6] text-[#8aa097]" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-t border-[#edf3ef] pt-5">
                                        <p className="text-xs leading-5 text-[#8aa097]">Perubahan profil tersimpan langsung.</p>
                                        <Button type="submit" disabled={processing} className="h-11 rounded-full bg-[#2d8b60] px-5 text-sm font-semibold text-white shadow-none hover:bg-[#247850]">
                                            <Save className="size-4" />
                                            {processing ? 'Menyimpan...' : 'Simpan profil'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>

                    <section className="rounded-[28px] border border-[#e8f0eb] bg-white p-5 shadow-none sm:p-7">
                        <div className="mb-7 flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#fff5df] text-[#c18822]"><KeyRound className="size-5" /></span>
                            <div>
                                <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173d30]">Kata sandi</h2>
                                <p className="mt-1 text-xs text-[#8aa097]">Ganti kata sandi tanpa halaman bawaan Laravel.</p>
                            </div>
                        </div>

                        <Form
                            {...SecurityController.update.form()}
                            options={{ preserveScroll: true }}
                            resetOnError={['password', 'password_confirmation', 'current_password']}
                            resetOnSuccess
                            className="space-y-5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="flex gap-3 rounded-2xl bg-[#f5fbf7] p-4 text-xs leading-5 text-[#6f887c]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2d8b60]" />Gunakan minimal 8 karakter dan jangan bagikan kata sandimu.</div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="current_password" className="text-[#315847]">Kata sandi saat ini</Label>
                                        <PasswordInput id="current_password" name="current_password" autoComplete="current-password" placeholder="Masukkan kata sandi saat ini" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                        <InputError message={errors.current_password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password" className="text-[#315847]">Kata sandi baru</Label>
                                        <PasswordInput id="password" name="password" autoComplete="new-password" passwordrules={passwordRules} placeholder="Masukkan kata sandi baru" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation" className="text-[#315847]">Konfirmasi kata sandi</Label>
                                        <PasswordInput id="password_confirmation" name="password_confirmation" autoComplete="new-password" passwordrules={passwordRules} placeholder="Ulangi kata sandi baru" className="h-12 rounded-2xl border-[#d9e9df] bg-[#fbfdfb]" />
                                        <InputError message={errors.password_confirmation} />
                                    </div>
                                    <div className="flex justify-end border-t border-[#edf3ef] pt-5">
                                        <Button type="submit" disabled={processing} className="h-11 rounded-full bg-[#2d8b60] px-5 text-sm font-semibold text-white shadow-none hover:bg-[#247850]">
                                            <Check className="size-4" />
                                            {processing ? 'Menyimpan...' : 'Simpan kata sandi'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil',
            href: edit(),
        },
    ],
};
