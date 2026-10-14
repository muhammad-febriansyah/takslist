import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CakeSlice,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FileClock,
    FileText,
    RotateCcw,
    Users,
} from 'lucide-react';
import { index as reviewsIndex } from '@/routes/reviews';
import { index as tasksIndex } from '@/routes/tasks';
import { index as adminUsersIndex } from '@/routes/admin/users';

type StatusCounts = { todo: number; in_progress: number; review: number; done: number };

export type OfficerPanelData = {
    timesheet: {
        period: string;
        status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
        approved_by: string | null;
        submitted_at: string | null;
    };
    supervisor: { id: number; name: string; position: string | null } | null;
    returned_tasks: { id: number; title: string; due_date: string | null; note: string | null; reviewer: string | null }[];
};

export type TeamPanelData = {
    stats: { members: number; pending_reviews: number; overdue: number; approved_this_month: number };
    status_counts: StatusCounts;
    weekly_completed: number[];
    members: {
        id: number;
        name: string;
        position: string | null;
        active: number;
        overdue: number;
        done: number;
        pending_reviews: number;
        oldest_pending_at: string | null;
    }[];
    deadlines: { id: number; title: string; status: string; due_date: string | null; owner: string | null }[];
};

export type SystemPanelData = {
    roles: { admin: number; dept_head: number; officer: number };
    tasks: { total: number; done: number; pending: number };
    status_counts: StatusCounts;
    attention: {
        inactive_users: number;
        officers_without_supervisor: number;
        dept_heads_without_officers: number;
        users_without_birth_date: number;
    };
    birthdays: { id: number; name: string; role: string; position: string | null; date: string; days_until: number; turning: number }[];
};

const card = 'rounded-2xl border border-[#e8f0eb] bg-white p-5 shadow-none sm:p-6';
const roleLabels: Record<string, string> = { admin: 'Admin', atasan: 'Dept Head', bawahan: 'Officer' };
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

function formatDate(date: string | null | undefined, withYear = false): string {
    if (!date) {
        return 'Tanpa tanggal';
    }

    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(
        new Date(`${date.slice(0, 10)}T00:00:00`),
    );
}

function formatPeriod(period: string): string {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`));
}

function PanelStat({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: 'green' | 'blue' | 'amber' | 'red' }) {
    const tones = {
        green: 'bg-[#eaf6ee] text-[#2d875c]',
        blue: 'bg-[#edf5fc] text-[#4f7cac]',
        amber: 'bg-[#fff7e6] text-[#bd7b17]',
        red: 'bg-[#fff0f0] text-[#d44f4f]',
    };

    return (
        <div className="rounded-2xl border border-[#e8f0eb] bg-white p-5">
            <p className="text-xs font-medium text-[#71877b]">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30]">{value}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{detail}</span>
            </div>
        </div>
    );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-base font-semibold text-[#173d30]">{title}</h2>
                {subtitle && <p className="mt-1 text-xs text-[#8aa097]">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

const timesheetStatus = {
    not_submitted: { label: 'Belum diajukan', detail: 'Selesaikan task lalu ajukan timesheet periode ini.', tone: 'bg-[#f1f5f2] text-[#71877b]', icon: FileText },
    pending: { label: 'Menunggu Dept Head', detail: 'Pengajuan sedang direview.', tone: 'bg-[#fff7e6] text-[#bd7b17]', icon: FileClock },
    approved: { label: 'Disetujui', detail: 'Timesheet siap diunduh.', tone: 'bg-[#eaf6ee] text-[#2d875c]', icon: CheckCircle2 },
    rejected: { label: 'Dikembalikan', detail: 'Ada task yang perlu diperbaiki.', tone: 'bg-[#fff0f0] text-[#d44f4f]', icon: RotateCcw },
} as const;

export function OfficerPanel({ data }: { data: OfficerPanelData }) {
    const status = timesheetStatus[data.timesheet.status];
    const StatusIcon = status.icon;

    return (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className={card}>
                <SectionTitle title="Timesheet bulan ini" subtitle={formatPeriod(data.timesheet.period)} />
                <div className="mt-5 flex items-center gap-4">
                    <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${status.tone}`}><StatusIcon className="size-5" /></span>
                    <div>
                        <p className="text-lg font-semibold text-[#173d30]">{status.label}</p>
                        <p className="text-xs text-[#8aa097]">{status.detail}</p>
                    </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eef3ef] pt-4 text-xs text-[#71877b]">
                    <span>{data.supervisor ? `Approver: ${data.supervisor.name}` : 'Belum ada Dept Head'}</span>
                    <Link href={tasksIndex()} className="inline-flex items-center gap-1 font-semibold text-[#2d875c]">Buka timesheet <ArrowUpRight className="size-3.5" /></Link>
                </div>
            </div>
            <div className={card}>
                <SectionTitle title="Perlu diperbaiki" subtitle="Task yang dikembalikan Dept Head beserta catatannya." />
                <div className="mt-3">
                    {data.returned_tasks.length > 0 ? data.returned_tasks.map((task) => (
                        <Link key={task.id} href={tasksIndex()} className="block border-b border-[#eef3ef] py-3 last:border-b-0">
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-medium text-[#315847]">{task.title}</p>
                                <span className="shrink-0 text-xs text-[#8aa097]">{formatDate(task.due_date)}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-[#d44f4f]">{task.note ?? 'Tanpa catatan.'}{task.reviewer ? ` — ${task.reviewer}` : ''}</p>
                        </Link>
                    )) : <p className="py-8 text-center text-sm text-[#8aa097]">Tidak ada task yang dikembalikan.</p>}
                </div>
            </div>
        </section>
    );
}

export function TeamPanel({ data, weekLabels }: { data: TeamPanelData; weekLabels: string[] }) {
    const areaOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Poppins, sans-serif' },
        colors: ['#2d875c'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.04, stops: [0, 100] } },
        grid: { borderColor: '#edf3ef', strokeDashArray: 4 },
        xaxis: { categories: weekLabels, labels: { style: { colors: '#8aa097', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: '#8aa097', fontSize: '11px' } } },
        tooltip: { theme: 'light' },
    };
    const donutOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'Poppins, sans-serif' },
        labels: ['To Do', 'In Progress', 'Review', 'Done'],
        colors: ['#9aaba2', '#4f7cac', '#d8a23c', '#2d875c'],
        stroke: { width: 4, colors: ['#ffffff'] },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#557067' }, markers: { size: 6 } },
        plotOptions: { pie: { donut: { size: '72%' } } },
        tooltip: { theme: 'light' },
    };
    const counts = data.status_counts;

    return (
        <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PanelStat label="Menunggu review" value={data.stats.pending_reviews} detail={data.stats.pending_reviews > 0 ? 'Perlu tindakan' : 'Bersih'} tone={data.stats.pending_reviews > 0 ? 'amber' : 'green'} />
                <PanelStat label="Officer aktif" value={data.stats.members} detail="Tim kamu" tone="blue" />
                <PanelStat label="Task tim terlambat" value={data.stats.overdue} detail={data.stats.overdue > 0 ? 'Perlu dipantau' : 'Aman'} tone={data.stats.overdue > 0 ? 'red' : 'green'} />
                <PanelStat label="Disetujui bulan ini" value={data.stats.approved_this_month} detail="Task" tone="green" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
                <div className={card}>
                    <SectionTitle title="Progres tim 7 hari terakhir" subtitle="Task selesai seluruh Officer." />
                    <div className="mt-5"><Chart options={areaOptions} series={[{ name: 'Task selesai', data: data.weekly_completed }]} type="area" height={250} /></div>
                </div>
                <div className={card}>
                    <SectionTitle title="Distribusi status tim" subtitle="Posisi task seluruh Officer." />
                    <Chart options={donutOptions} series={[counts.todo, counts.in_progress, counts.review, counts.done]} type="donut" height={270} />
                </div>
            </section>

            <section className={card}>
                <SectionTitle
                    title="Beban kerja tim"
                    subtitle="Ringkasan per Officer."
                    action={<Link href={reviewsIndex()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d875c]">Buka review <ClipboardCheck className="size-3.5" /></Link>}
                />
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="text-xs text-[#91a49b]">
                            <tr className="border-b border-[#eef3ef]">
                                <th className="py-2 pr-3 font-medium">Officer</th>
                                <th className="px-3 py-2 text-right font-medium">Aktif</th>
                                <th className="px-3 py-2 text-right font-medium">Terlambat</th>
                                <th className="px-3 py-2 text-right font-medium">Selesai</th>
                                <th className="py-2 pl-3 text-right font-medium">Menunggu review</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.members.length > 0 ? data.members.map((member) => (
                                <tr key={member.id} className="border-b border-[#eef3ef] last:border-b-0">
                                    <td className="py-3 pr-3"><p className="font-medium text-[#315847]">{member.name}</p><p className="text-xs text-[#8aa097]">{member.position ?? 'Officer'}</p></td>
                                    <td className="px-3 py-3 text-right text-[#557067]">{member.active}</td>
                                    <td className={`px-3 py-3 text-right ${member.overdue > 0 ? 'font-semibold text-[#d44f4f]' : 'text-[#557067]'}`}>{member.overdue}</td>
                                    <td className="px-3 py-3 text-right text-[#557067]">{member.done}</td>
                                    <td className="py-3 pl-3 text-right">
                                        {member.pending_reviews > 0
                                            ? <span className="rounded-full bg-[#fff7e6] px-2.5 py-1 text-xs font-semibold text-[#bd7b17]">{member.pending_reviews} task</span>
                                            : <span className="text-xs text-[#9aac9f]">—</span>}
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} className="py-8 text-center text-sm text-[#8aa097]">Belum ada Officer di bawahmu.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={card}>
                <SectionTitle title="Deadline tim terdekat" subtitle="Task Officer yang belum selesai." />
                <div className="mt-3">
                    {data.deadlines.length > 0 ? data.deadlines.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-3 border-b border-[#eef3ef] py-3 last:border-b-0">
                            <div className="min-w-0"><p className="truncate text-sm font-medium text-[#315847]">{task.title}</p><p className="text-xs text-[#8aa097]">{task.owner} · {statusLabels[task.status] ?? task.status}</p></div>
                            <span className="shrink-0 text-xs text-[#71877b]">{formatDate(task.due_date)}</span>
                        </div>
                    )) : <p className="py-8 text-center text-sm text-[#8aa097]">Tidak ada deadline tim.</p>}
                </div>
            </section>
        </>
    );
}

export function SystemPanel({ data }: { data: SystemPanelData }) {
    const attention = [
        { label: 'Officer tanpa Dept Head', value: data.attention.officers_without_supervisor },
        { label: 'Dept Head tanpa Officer', value: data.attention.dept_heads_without_officers },
        { label: 'Akun nonaktif', value: data.attention.inactive_users },
        { label: 'Akun belum isi tanggal lahir', value: data.attention.users_without_birth_date },
    ];
    const donutOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'Poppins, sans-serif' },
        labels: ['To Do', 'In Progress', 'Review', 'Done'],
        colors: ['#9aaba2', '#4f7cac', '#d8a23c', '#2d875c'],
        stroke: { width: 4, colors: ['#ffffff'] },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#557067' }, markers: { size: 6 } },
        plotOptions: { pie: { donut: { size: '72%' } } },
        tooltip: { theme: 'light' },
    };
    const counts = data.status_counts;

    return (
        <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PanelStat label="Admin" value={data.roles.admin} detail="Akun" tone="blue" />
                <PanelStat label="Dept Head" value={data.roles.dept_head} detail="Akun" tone="green" />
                <PanelStat label="Officer" value={data.roles.officer} detail="Akun" tone="green" />
                <PanelStat label="Task belum selesai" value={data.tasks.pending} detail={`${data.tasks.done} selesai`} tone="amber" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className={card}>
                    <SectionTitle
                        title="Ulang tahun"
                        subtitle="Pengguna aktif yang berulang tahun 30 hari ke depan."
                        action={<span className="flex size-9 items-center justify-center rounded-xl bg-[#fff3f7] text-[#d4547e]"><CakeSlice className="size-4" /></span>}
                    />
                    <div className="mt-3">
                        {data.birthdays.length > 0 ? data.birthdays.map((person) => (
                            <div key={person.id} className="flex items-center justify-between gap-3 border-b border-[#eef3ef] py-3 last:border-b-0">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#315847]">{person.name}</p>
                                    <p className="text-xs text-[#8aa097]">{person.position ?? roleLabels[person.role] ?? person.role} · {person.turning} tahun</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    {person.days_until === 0
                                        ? <span className="rounded-full bg-[#fff3f7] px-2.5 py-1 text-xs font-semibold text-[#d4547e]">Hari ini 🎂</span>
                                        : <><p className="text-xs font-medium text-[#557067]">{formatDate(person.date)}</p><p className="text-[11px] text-[#9aac9f]">{person.days_until} hari lagi</p></>}
                                </div>
                            </div>
                        )) : <p className="py-8 text-center text-sm text-[#8aa097]">Tidak ada ulang tahun dalam 30 hari ke depan.</p>}
                    </div>
                </div>
                <div className={card}>
                    <SectionTitle
                        title="Perlu perhatian"
                        subtitle="Data akun yang perlu dirapikan."
                        action={<Link href={adminUsersIndex()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d875c]">Kelola <Users className="size-3.5" /></Link>}
                    />
                    <div className="mt-3">
                        {attention.map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-3 border-b border-[#eef3ef] py-3 last:border-b-0">
                                <span className="flex items-center gap-2 text-sm text-[#315847]">
                                    {item.value > 0 ? <AlertTriangle className="size-4 text-[#bd7b17]" /> : <CheckCircle2 className="size-4 text-[#2d875c]" />}
                                    {item.label}
                                </span>
                                <span className={`text-sm font-semibold ${item.value > 0 ? 'text-[#bd7b17]' : 'text-[#9aac9f]'}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={card}>
                <SectionTitle title="Distribusi status seluruh sistem" subtitle={`${data.tasks.total} task dari semua pengguna.`} action={<Clock3 className="size-4 text-[#9aac9f]" />} />
                <Chart options={donutOptions} series={[counts.todo, counts.in_progress, counts.review, counts.done]} type="donut" height={280} />
            </section>
        </>
    );
}
