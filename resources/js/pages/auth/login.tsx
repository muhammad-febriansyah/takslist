import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Masuk" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-sm font-medium text-[#113524]">
                                    Alamat email
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="nama@contoh.com"
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-sm font-medium text-[#113524]">
                                    Kata sandi
                                </Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-[#225e3d]/55" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Masukkan kata sandi"
                                        className="h-[52px] rounded-2xl border-[#d5e5da] bg-white pl-12 text-sm text-[#113524] shadow-none placeholder:text-[#225e3d]/35 focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="size-5 rounded-md border-[#b6d1be] data-[state=checked]:border-[#36764f] data-[state=checked]:bg-[#36764f]"
                                />
                                    <Label htmlFor="remember" className="cursor-pointer text-sm font-medium text-[#19472f]">
                                        Ingat saya
                                    </Label>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                tabIndex={4}
                                disabled={processing}
                                className="group mt-1 h-[52px] w-full rounded-2xl bg-[#36764f] text-sm font-semibold text-white shadow-none hover:bg-[#225e3d] focus-visible:ring-4 focus-visible:ring-[#d5e5da]"
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Masuk
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-4 py-1">
                            <div className="h-px flex-1 bg-[#eaf2ec]" />
                            <span className="text-xs text-[#225e3d]/45">atau</span>
                            <div className="h-px flex-1 bg-[#eaf2ec]" />
                        </div>

                        <p className="text-center text-sm text-[#225e3d]/55">
                            Belum punya akun?{' '}
                            <Link href={register()} className="font-medium text-[#36764f] hover:text-[#19472f] hover:underline">
                                Daftar
                            </Link>
                        </p>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Selamat datang kembali',
    description: 'Masuk untuk melanjutkan progres dan daftar tugasmu.',
};
