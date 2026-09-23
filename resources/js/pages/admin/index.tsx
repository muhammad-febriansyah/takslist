import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Head } from '@inertiajs/react';
import { Activity, CheckCircle2, ClipboardList, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'atasan' | 'bawahan';
    tasks_count: number;
    supervisor?: { id: number; name: string } | null;
};

type RecentTask = {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    user: { id: number; name: string };
};

type Props = {
    metrics: {
        users: number;
        tasks: number;
        pending: number;
        done: number;
    };
    statusCounts: Record<string, number>;
    users: UserRow[];
    recentTasks: RecentTask[];
};

const roleLabels = { admin: 'Admin', atasan: 'Atasan', bawahan: 'Bawahan' } as const;
const statusLabels: Record<string, string> = { todo: 'To do', in_progress: 'In progress', review: 'Review', done: 'Selesai' };
const priorityLabels: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };

function formatDate(date: string | null): string {
    if (!date) return 'Tanpa tanggal';

    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

export default function AdminMonitoring({ metrics, statusCounts, users, recentTasks }: Props) {
    const chartOptions: ApexOptions = {
        chart: { toolbar: { show: false } },
        labels: ['To do', 'In progress', 'Review', 'Selesai'],
        colors: ['#aabbb2', '#4e8fc7', '#e1a62f', '#3d9b68'],
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['#fff'] },
    };

    return (
        <>
            <Head title="Monitoring admin" />
            <main className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">ADMIN / MONITORING</p>
                        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30] sm:text-4xl">Pantau workspace</h1>
                        <p className="mt-2 text-sm leading-6 text-[#7f978d]">Ringkasan global untuk pengecekan admin. Data tetap read-only.</p>
                    </div>
                    <div className="rounded-full border border-[#cfe4d7] bg-[#f0f8f3] px-4 py-2 text-xs font-semibold text-[#26724b]">Mode admin · read-only</div>
                </div>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={Users} label="Pengguna" value={metrics.users} tone="green" />
                    <MetricCard icon={ClipboardList} label="Semua task" value={metrics.tasks} tone="blue" />
                    <MetricCard icon={Activity} label="Task berjalan" value={metrics.pending} tone="amber" />
                    <MetricCard icon={CheckCircle2} label="Selesai" value={metrics.done} tone="violet" />
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-3xl border border-[#e1eee7] bg-white p-5 shadow-[0_6px_18px_rgba(32,83,57,0.04)] sm:p-7">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173d30]">Komposisi status task</h2>
                                <p className="mt-1 text-xs text-[#8aa097]">Snapshot lintas workspace</p>
                            </div>
                            <ShieldCheck className="size-5 text-[#3f9364]" />
                        </div>
                        <div className="space-y-4">
                            {Object.entries(statusLabels).map(([status, label]) => {
                                const total = statusCounts[status] ?? 0;
                                const percentage = metrics.tasks > 0 ? Math.round((total / metrics.tasks) * 100) : 0;
                                const color = status === 'done' ? 'bg-[#3d9b68]' : status === 'review' ? 'bg-[#e1a62f]' : status === 'in_progress' ? 'bg-[#4e8fc7]' : 'bg-[#aabbb2]';

                                return (
                                    <div key={status}>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="font-medium text-[#365a4b]">{label}</span>
                                            <span className="text-xs text-[#8aa097]">{total} task · {percentage}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[#edf4ef]">
                                            <div className={'h-full rounded-full ' + color} style={{ width: percentage + '%' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 border-t border-[#edf3ef] pt-4"><Chart options={chartOptions} series={[statusCounts.todo ?? 0, statusCounts.in_progress ?? 0, statusCounts.review ?? 0, statusCounts.done ?? 0]} type="donut" height={250} /></div>
                    </div>

                    <div className="rounded-3xl border border-[#e1eee7] bg-white p-5 shadow-[0_6px_18px_rgba(32,83,57,0.04)] sm:p-7">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173d30]">Pengguna dan atasan</h2>
                            <p className="mt-1 text-xs text-[#8aa097]">Struktur akses aktif</p>
                        </div>
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7faf8] px-3 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[#244a3a]">{user.name}</p>
                                        <p className="truncate text-xs text-[#91a49b]">{user.supervisor ? 'Atasan: ' + user.supervisor.name : user.email}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Badge className="rounded-full border-0 bg-[#e8f4ec] text-[10px] text-[#32724e]">{roleLabels[user.role]}</Badge>
                                        <span className="text-xs text-[#8aa097]">{user.tasks_count} task</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-6 rounded-3xl border border-[#e1eee7] bg-white p-5 shadow-[0_6px_18px_rgba(32,83,57,0.04)] sm:p-7">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173d30]">Task terbaru</h2>
                        <p className="mt-1 text-xs text-[#8aa097]">Pengecekan aktivitas terbaru tanpa aksi edit.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="border-b border-[#edf3ef] text-xs text-[#91a49b]">
                                <tr>
                                    <th className="pb-3 font-medium">Task</th>
                                    <th className="pb-3 font-medium">Pemilik</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Prioritas</th>
                                    <th className="pb-3 text-right font-medium">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f4f1]">
                                {recentTasks.map((task) => (
                                    <tr key={task.id}>
                                        <td className="py-4 font-semibold text-[#315847]">{task.title}</td>
                                        <td className="py-4 text-[#6f887c]">{task.user.name}</td>
                                        <td className="py-4"><span className="rounded-full bg-[#f0f6f2] px-2.5 py-1 text-xs text-[#4b765f]">{statusLabels[task.status] ?? task.status}</span></td>
                                        <td className="py-4 text-[#6f887c]">{priorityLabels[task.priority] ?? task.priority}</td>
                                        <td className="py-4 text-right text-[#6f887c]">{formatDate(task.due_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </>
    );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'green' | 'blue' | 'amber' | 'violet' }) {
    const tones = {
        green: 'bg-[#e9f7ee] text-[#32845a]',
        blue: 'bg-[#eaf4fb] text-[#4d89b8]',
        amber: 'bg-[#fff6df] text-[#c08c22]',
        violet: 'bg-[#f1edfb] text-[#7761ae]',
    };

    return (
        <div className="rounded-3xl border border-[#e1eee7] bg-white p-5 shadow-[0_6px_18px_rgba(32,83,57,0.04)]">
            <div className={'mb-5 flex size-11 items-center justify-center rounded-2xl ' + tones[tone]}><Icon className="size-5" /></div>
            <p className="text-sm text-[#82998e]">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#173d30]">{value}</p>
        </div>
    );
}
