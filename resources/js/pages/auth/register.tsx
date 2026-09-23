import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
    supervisors: Array<{
        id: number;
        name: string;
        position: string | null;
    }>;
};

export default function Register({ passwordRules, supervisors }: Props) {
    const [supervisorId, setSupervisorId] = useState('');

    return (
        <>
            <Head title="Daftar" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-sm font-medium text-[#113524]">
                                    Nama lengkap <span className="text-[#d44f4f]">*</span>
                                </Label>
                                <div className="relative">
                                    <UserRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        name="name"
                                        placeholder="Contoh: Budi Santoso"
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-sm font-medium text-[#113524]">
                                    Alamat email <span className="text-[#d44f4f]">*</span>
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="nama@contoh.com"
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="supervisor_id" className="text-sm font-medium text-[#113524]">
                                    Atasan <span className="text-[#d44f4f]">*</span>
                                </Label>
                                <SearchableSelect
                                    value={supervisorId}
                                    onChange={setSupervisorId}
                                    options={supervisors.map((supervisor) => ({
                                        value: String(supervisor.id),
                                        label: supervisor.name,
                                        description: supervisor.position,
                                    }))}
                                    placeholder="Pilih atasan"
                                    searchPlaceholder="Cari nama atasan..."
                                    aria-label="Pilih atasan"
                                    disabled={!supervisors.length}
                                />
                                <input type="hidden" id="supervisor_id" name="supervisor_id" value={supervisorId} />
                                <InputError message={errors.supervisor_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-sm font-medium text-[#113524]">
                                    Kata sandi <span className="text-[#d44f4f]">*</span>
                                </Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <PasswordInput
                                        id="password"
                                        required
                                        tabIndex={4}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Minimal 8 karakter"
                                        passwordrules={passwordRules}
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation" className="text-sm font-medium text-[#113524]">
                                    Konfirmasi kata sandi <span className="text-[#d44f4f]">*</span>
                                </Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        tabIndex={5}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Ulangi kata sandi"
                                        passwordrules={passwordRules}
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button
                                type="submit"
                                className="group mt-1 h-[52px] w-full rounded-2xl bg-[#36764f] text-sm font-semibold text-white shadow-none hover:bg-[#225e3d] focus-visible:ring-4 focus-visible:ring-[#d5e5da]"
                                tabIndex={6}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Buat akun
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        </div>

                        <p className="text-center text-sm text-[#225e3d]/55">
                            Sudah punya akun?{' '}
                            <Link href={login()} tabIndex={7} className="font-medium text-[#36764f] hover:text-[#19472f] hover:underline">
                                Masuk
                            </Link>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Buat akun baru',
    description: 'Daftar untuk mulai mengatur progres dan daftar tugasmu.',
};
