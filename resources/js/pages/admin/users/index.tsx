import { Form, Head, router } from '@inertiajs/react';
import { columnFilteringFeature, createColumnHelper, globalFilteringFeature, tableFeatures, useTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Pencil, Plus, Power, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Questionnaire } from '@shadcn/react/questionnaire';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { bulkDestroy, destroy, index as usersIndex, store, update } from '@/routes/admin/users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Role = 'admin' | 'atasan' | 'bawahan';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: Role;
    position: string | null;
    supervisor_id: number | null;
    supervisor: { id: number; name: string } | null;
    tasks_count: number;
    is_active: boolean;
    created_at: string | null;
};

type Supervisor = { id: number; name: string };

type UserPagination = {
    data: UserRow[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

const usersTableFeatures = tableFeatures({ columnFilteringFeature, globalFilteringFeature });
type UsersTableFeatures = typeof usersTableFeatures;
const userColumnHelper = createColumnHelper<UsersTableFeatures, UserRow>();

const roleLabels: Record<Role, string> = {
    admin: 'Admin',
    atasan: 'Atasan',
    bawahan: 'Bawahan',
};

const roleItems = [
    {
        name: 'role',
        required: true,
        choices: [{ value: 'bawahan' }, { value: 'atasan' }, { value: 'admin' }],
    },
] as const;

function RequiredMark() {
    return <span className="text-[#d15a5a]"> *</span>;
}

export default function UsersPage({ users: pagination, supervisors, search: initialSearch = '' }: { users: UserPagination; supervisors: Supervisor[]; search?: string }) {
    const users = pagination.data;
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('bawahan');
    const [position, setPosition] = useState('');
    const [supervisorId, setSupervisorId] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [search, setSearch] = useState(initialSearch);
    const [activeOverrides, setActiveOverrides] = useState<Record<number, boolean>>({});
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
    const isInitialSearchRender = useRef(true);

    useEffect(() => {
        setSelectedUserIds((ids) => ids.filter((id) => users.some((user) => user.id === id)));
    }, [users]);

    useEffect(() => {
        if (isInitialSearchRender.current) {
            isInitialSearchRender.current = false;
            return;
        }

        const timeout = window.setTimeout(() => {
            router.visit(usersIndex.url({ query: { search: search.trim() || undefined } }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search]);

    function resetForm(): void {
        setEditingUser(null);
        setName('');
        setEmail('');
        setRole('bawahan');
        setPosition('');
        setSupervisorId(supervisors[0] ? String(supervisors[0].id) : '');
        setPassword('');
        setPasswordConfirmation('');
        setIsActive(true);
    }

    function openCreate(): void {
        resetForm();
        setIsFormOpen(true);
    }

    function openEdit(user: UserRow): void {
        setEditingUser(user);
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setPosition(user.position ?? '');
        setSupervisorId(user.supervisor_id ? String(user.supervisor_id) : '');
        setPassword('');
        setPasswordConfirmation('');
        setIsActive(user.is_active);
        setIsFormOpen(true);
    }

    function closeForm(): void {
        setIsFormOpen(false);
        resetForm();
    }

    const formDefinition = editingUser ? update.form(editingUser.id) : store.form();

    function toggleUserStatus(user: UserRow, active: boolean): void {
        setActiveOverrides((states) => ({ ...states, [user.id]: active }));
        setUpdatingUserId(user.id);

        router.put(update.url(user.id), {
            name: user.name,
            email: user.email,
            role: user.role,
            position: user.position ?? '',
            supervisor_id: user.supervisor_id ?? '',
            is_active: active,
        }, {
            preserveScroll: true,
            onError: () => setActiveOverrides((states) => ({ ...states, [user.id]: user.is_active })),
            onSuccess: () => setActiveOverrides((states) => {
                const nextStates = { ...states };
                delete nextStates[user.id];
                return nextStates;
            }),
            onFinish: () => setUpdatingUserId(null),
        });
    }

    function submitSearch(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        router.visit(usersIndex.url({ query: { search: search.trim() || undefined } }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function visitPage(page: number): void {
        router.visit(usersIndex.url({ query: { page, search: search.trim() || undefined } }), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    const columns = useMemo(() => userColumnHelper.columns([
        userColumnHelper.display({
            id: 'select',
            header: () => <input type="checkbox" checked={users.length > 0 && selectedUserIds.length === users.length} onChange={toggleAllUsers} aria-label="Pilih semua pengguna" className="size-4 accent-[#2d875c]" />,
            cell: ({ row }) => {
                const user = row.original;

                return <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)} aria-label={`Pilih ${user.name}`} className="size-4 accent-[#2d875c]" />;
            },
        }),
        userColumnHelper.accessor('name', {
            header: 'Pengguna',
            cell: ({ row }) => (
                <>
                    <p className="font-semibold text-[#315847]">{row.original.name}</p>
                    <p className="mt-1 text-xs text-[#91a49b]">{row.original.email}</p>
                </>
            ),
        }),
        userColumnHelper.accessor('role', {
            header: 'Role',
            cell: ({ row }) => <Badge className="rounded-full border-0 bg-[#e8f4ec] text-[10px] text-[#32724e]">{roleLabels[row.original.role]}</Badge>,
        }),
        userColumnHelper.accessor('supervisor', {
            header: 'Atasan',
            cell: ({ row }) => <span className="text-[#6f887c]">{row.original.supervisor?.name ?? '—'}</span>,
        }),
        userColumnHelper.accessor('tasks_count', {
            header: 'Task',
            cell: ({ row }) => <span className="text-[#6f887c]">{row.original.tasks_count}</span>,
        }),
        userColumnHelper.accessor('is_active', {
            header: 'Status',
            cell: ({ row }) => {
                const active = activeOverrides[row.original.id] ?? row.original.is_active;

                return <Badge className={`rounded-full border-0 text-[10px] ${active ? 'bg-[#e8f4ec] text-[#32724e]' : 'bg-[#fbeaea] text-[#b34e4e]'}`}>{active ? 'Aktif' : 'Nonaktif'}</Badge>;
            },
        }),
        userColumnHelper.display({
            id: 'actions',
            header: () => <span className="block text-right">Aksi</span>,
            cell: ({ row }) => {
                const user = row.original;
                const active = activeOverrides[user.id] ?? user.is_active;

                return (
                    <div className="flex justify-end gap-2">
                        <Toggle
                            type="button"
                            pressed={active}
                            onPressedChange={(nextActive) => toggleUserStatus(user, nextActive)}
                            disabled={updatingUserId === user.id}
                            variant="outline"
                            size="sm"
                            aria-label={`${active ? 'Nonaktifkan' : 'Aktifkan'} ${user.name}`}
                            className={`rounded-full border px-2.5 text-[11px] ${active ? 'border-[#cde8d7] bg-[#edf9f1] text-[#2d875c] hover:bg-[#dff3e6]' : 'border-[#f0d7d7] bg-[#fff1f1] text-[#c45c5c] hover:bg-[#ffe4e4]'}`}
                        >
                            <Power className="size-3.5" />
                            {active ? 'On' : 'Off'}
                        </Toggle>
                        <Button type="button" onClick={() => openEdit(user)} className="h-9 rounded-lg bg-[#eaf4fb] px-3 text-xs font-semibold text-[#3f79ad] hover:bg-[#dcecf9]"><Pencil className="size-3.5" /> Edit</Button>
                        <Button type="button" onClick={() => setDeletingUser(user)} className="h-9 rounded-lg bg-[#fff0f0] px-3 text-xs font-semibold text-[#c45c5c] hover:bg-[#ffe1e1]"><Trash2 className="size-3.5" /> Hapus</Button>
                    </div>
                );
            },
        }),
    ]), [activeOverrides, selectedUserIds, updatingUserId, users.length]);

    const table = useTable({
        features: usersTableFeatures,
        data: users,
        columns,
        state: { globalFilter: search },
        onGlobalFilterChange: (updater) => setSearch((current) => typeof updater === 'function' ? updater(current) : updater),
        manualFiltering: true,
    });

    function toggleUserSelection(userId: number): void {
        setSelectedUserIds((ids) => ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]);
    }

    function toggleAllUsers(): void {
        setSelectedUserIds((ids) => ids.length === users.length ? [] : users.map((user) => user.id));
    }

    return (
        <>
            <Head title="Pengguna" />
            <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">ADMIN / PENGGUNA</p>
                        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30] sm:text-4xl">Kelola pengguna</h1>
                        <p className="mt-2 text-sm leading-6 text-[#7f978d]">Atur akun, role, dan hubungan atasan-bawahan.</p>
                    </div>
                    <Button type="button" onClick={openCreate} className="h-11 rounded-full bg-[#2d8b60] px-5 text-sm font-semibold text-white hover:bg-[#247850]">
                        <Plus className="size-4" /> Pengguna baru
                    </Button>
                </div>

                <section className="overflow-hidden rounded-3xl border border-[#e1eee7] bg-white shadow-[0_6px_18px_rgba(32,83,57,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3ef] px-5 py-4 sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#eaf6ee] text-[#2d875c]"><Users className="size-5" /></span>
                            <div>
                                <h2 className="text-sm font-semibold text-[#173d30]">Daftar pengguna</h2>
                                <p className="mt-1 text-xs text-[#8aa097]">{pagination.total} akun terdaftar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedUserIds.length > 0 && <Button type="button" onClick={() => setIsBulkDeleteOpen(true)} className="h-9 rounded-full bg-[#fff0f0] px-3 text-xs font-semibold text-[#c44f4f] hover:bg-[#ffe2e2]"><Trash2 className="size-3.5" /> Hapus {selectedUserIds.length}</Button>}
                            <ShieldCheck className="size-5 text-[#75a887]" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 border-b border-[#edf3ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <form onSubmit={submitSearch} className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8aa097]" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama atau email..."
                                aria-label="Cari pengguna"
                                className="h-10 rounded-xl border-[#dfeae3] pl-10 text-sm"
                            />
                        </form>
                        <p className="text-xs text-[#8aa097]">
                            Menampilkan {pagination.from ?? 0}–{pagination.to ?? 0} dari {pagination.total} pengguna
                        </p>
                    </div>
                    <Table className="min-w-[980px] text-left">
                        <TableHeader className="bg-[#fbfdfb] text-xs text-[#91a49b]">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className={header.id === 'select' ? 'w-12 px-5 sm:px-7' : header.id === 'actions' ? 'text-right sm:pr-7' : undefined}>
                                            {header.isPlaceholder ? null : table.FlexRender({ header })}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-[#fbfdfb]">
                                    {row.getAllCells().map((cell) => (
                                        <TableCell key={cell.id} className={cell.column.id === 'select' ? 'px-5 sm:px-7' : cell.column.id === 'name' ? 'py-4' : cell.column.id === 'actions' ? 'sm:pr-7' : undefined}>
                                            {table.FlexRender({ cell })}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-[#8aa097]">Pengguna tidak ditemukan.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {pagination.last_page > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ef] px-5 py-4 sm:px-7">
                            <p className="text-xs text-[#8aa097]">Halaman {pagination.current_page} dari {pagination.last_page}</p>
                            <div className="flex items-center gap-1.5">
                                <Button type="button" variant="outline" disabled={pagination.current_page === 1} onClick={() => visitPage(pagination.current_page - 1)} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]">
                                    <ChevronLeft className="size-4" />
                                    <span className="sr-only">Halaman sebelumnya</span>
                                </Button>
                                {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                                    <Button key={page} type="button" variant="outline" onClick={() => visitPage(page)} className={`size-9 rounded-lg p-0 text-xs ${page === pagination.current_page ? 'border-[#2d875c] bg-[#e8f4ec] text-[#236d49]' : 'border-[#dfeae3] text-[#557067]'}`}>
                                        {page}
                                    </Button>
                                ))}
                                <Button type="button" variant="outline" disabled={pagination.current_page === pagination.last_page} onClick={() => visitPage(pagination.current_page + 1)} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]">
                                    <ChevronRight className="size-4" />
                                    <span className="sr-only">Halaman berikutnya</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[720px]">
                    <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">{editingUser ? 'Edit pengguna' : 'Tambah pengguna'}</DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">Lengkapi identitas dan akses pengguna.</DialogDescription>
                    </DialogHeader>
                    <Questionnaire.Root
                        items={roleItems}
                        defaultItem="role"
                        noValidate
                        onSubmit={(event) => event.preventDefault()}
                        className="grid gap-2"
                    >
                        <Questionnaire.Item name="role" required className="grid gap-2 border-0 p-0">
                            <Questionnaire.Title className="text-sm font-medium text-[#315847]">Role<RequiredMark /></Questionnaire.Title>
                            <Questionnaire.Description className="sr-only">Pilih role pengguna</Questionnaire.Description>
                            <Questionnaire.Choices className="grid gap-2 sm:grid-cols-3">
                                {(Object.keys(roleLabels) as Role[]).map((option) => (
                                    <Questionnaire.Choice
                                        key={option}
                                        value={option}
                                        checked={role === option}
                                        onChange={() => {
                                            setRole(option);
                                            if (option !== 'bawahan') {
                                                setSupervisorId('');
                                            }
                                        }}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9e9df] px-3 py-2.5 text-sm text-[#557067] transition-colors data-[checked]:border-[#72b68a] data-[checked]:bg-[#eff9f2] data-[checked]:text-[#236d49]"
                                    >
                                        <Questionnaire.ChoiceInput className="accent-[#2d875c]" />
                                        <Questionnaire.ChoiceLabel>{roleLabels[option]}</Questionnaire.ChoiceLabel>
                                    </Questionnaire.Choice>
                                ))}
                            </Questionnaire.Choices>
                        </Questionnaire.Item>
                    </Questionnaire.Root>
                    <Form key={editingUser?.id ?? 'new'} {...formDefinition} options={{ preserveScroll: true }} onSuccess={closeForm} className="grid gap-5">
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-name">Nama<RequiredMark /></Label>
                                        <Input id="user-name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Budi Santoso" required className="h-11 rounded-xl border-[#d9e9df]" />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-email">Email<RequiredMark /></Label>
                                        <Input id="user-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.com" required className="h-11 rounded-xl border-[#d9e9df]" />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>

                                <input type="hidden" name="role" value={role} />
                                <input type="hidden" name="is_active" value={isActive ? '1' : '0'} />
                                <div className="grid gap-2">
                                    <Label htmlFor="user-position">Jabatan</Label>
                                    <Input id="user-position" name="position" value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Contoh: Head of IT" className="h-11 rounded-xl border-[#d9e9df]" />
                                    <InputError message={errors.position} />
                                </div>
                                {role === 'bawahan' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-supervisor">Atasan<RequiredMark /></Label>
                                        <select id="user-supervisor" name="supervisor_id" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} required className="h-11 w-full rounded-xl border border-[#d9e9df] bg-white px-3 text-sm text-[#315847] outline-none focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]">
                                            <option value="">Pilih atasan</option>
                                            {supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}
                                        </select>
                                        <InputError message={errors.supervisor_id} />
                                    </div>
                                )}

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-password">Password{!editingUser && <RequiredMark />}</Label>
                                        <PasswordInput id="user-password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'} required={!editingUser} className="h-11 rounded-xl border-[#d9e9df]" />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-password-confirmation">Konfirmasi password{!editingUser && <RequiredMark />}</Label>
                                        <PasswordInput id="user-password-confirmation" name="password_confirmation" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Ulangi password" required={!editingUser} className="h-11 rounded-xl border-[#d9e9df]" />
                                    </div>
                                </div>

                                <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                                    <Button type="button" variant="outline" onClick={closeForm} className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]">Batal</Button>
                                    <Button type="submit" disabled={processing} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]">{processing ? 'Menyimpan...' : editingUser ? 'Simpan perubahan' : 'Buat pengguna'}</Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <DialogContent className="border-[#f0d7d7] bg-white sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-[#6e2929]">Hapus pengguna?</DialogTitle>
                        <DialogDescription className="leading-6 text-[#8f6e6e]">Akun {deletingUser?.name} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</DialogDescription>
                    </DialogHeader>
                    {deletingUser && <Form {...destroy.form(deletingUser.id)} options={{ preserveScroll: true }} onSuccess={() => setDeletingUser(null)} className="mt-2">
                        {({ processing, errors }) => (
                            <>
                                <InputError message={errors.user} />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setDeletingUser(null)} className="h-11 rounded-xl border-[#dfeae3] text-[#557067]">Batal</Button>
                                    <Button type="submit" disabled={processing} className="h-11 rounded-xl bg-[#c95353] px-5 text-white hover:bg-[#ad4141]">{processing ? 'Menghapus...' : 'Hapus pengguna'}</Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>}
                </DialogContent>
            </Dialog>

            <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
                <DialogContent className="border-[#f0d7d7] bg-white sm:max-w-[460px]">
                    <DialogHeader><DialogTitle className="text-xl text-[#6e2929]">Hapus pengguna terpilih?</DialogTitle><DialogDescription className="leading-6 text-[#8f6e6e]">{selectedUserIds.length} akun akan dihapus permanen. Pastikan tidak ada akun atasan yang masih memiliki bawahan.</DialogDescription></DialogHeader>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsBulkDeleteOpen(false)} className="h-11 rounded-xl border-[#dfeae3] text-[#557067]">Batal</Button><Button type="button" onClick={() => router.delete(bulkDestroy().url, { data: { user_ids: selectedUserIds }, preserveScroll: true, onSuccess: () => { setSelectedUserIds([]); setIsBulkDeleteOpen(false); } })} className="h-11 rounded-xl bg-[#c95353] px-5 text-white hover:bg-[#ad4141]"><Trash2 className="size-4" /> Hapus pengguna</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
