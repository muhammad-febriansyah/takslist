import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ListChecks,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import type { Auth } from '@/types/auth';
import { dashboard } from '@/routes';
import { index as calendarIndex } from '@/routes/calendar';
import { index as tasksIndex } from '@/routes/tasks';

type DashboardTask = {
    id: number;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high';
    due_date?: string | null;
    updated_at?: string | null;
};

type DashboardEvent = {
    id: number;
    title: string;
    event_date: string | null;
    color: string;
};

type Props = {
    stats: {
        total: number;
        in_progress: number;
        completed: number;
        overdue: number;
        calendar_events: number;
    };
    statusCounts: {
        todo: number;
        in_progress: number;
        review: number;
        done: number;
    };
    weeklyCompleted: number[];
    upcomingDeadlines: DashboardTask[];
    recentTasks: DashboardTask[];
    events: DashboardEvent[];
};

type DashboardLink = ReturnType<typeof tasksIndex> | ReturnType<typeof calendarIndex>;

const statusLabels: Record<DashboardTask['status'], string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
};

const statusStyles: Record<DashboardTask['status'], string> = {
    todo: 'bg-[#f1f5f2] text-[#71877b]',
    in_progress: 'bg-[#edf5fc] text-[#4f7cac]',
    review: 'bg-[#fff7e6] text-[#bd7b17]',
    done: 'bg-[#eaf6ee] text-[#2d875c]',
};

function formatDate(date: string | null | undefined): string {
    if (!date) {
        return 'Tanpa tanggal';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function formatRelativeDate(date: string | null | undefined): string {
    if (!date) {
        return 'Baru saja';
    }

    return new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' }).format(
        Math.round((new Date(date).getTime() - Date.now()) / 86_400_000),
        'day',
    );
}

function StatCard({
    label,
    value,
    detail,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    detail: string;
    icon: typeof ListChecks;
    tone: 'green' | 'blue' | 'amber' | 'red';
}) {
    const tones = {
        green: 'bg-[#eaf6ee] text-[#2d875c]',
        blue: 'bg-[#edf5fc] text-[#4f7cac]',
        amber: 'bg-[#fff7e6] text-[#bd7b17]',
        red: 'bg-[#fff0f0] text-[#d44f4f]',
    };

    return (
        <div className="rounded-2xl border border-[#dfeae3] bg-white p-5 shadow-[0_8px_24px_rgba(33,84,62,0.04)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium text-[#71877b]">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#173d30]">{value}</p>
                </div>
                <span className={`flex size-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
                    <Icon className="size-5" />
                </span>
            </div>
            <p className="mt-4 text-xs text-[#8aa097]">{detail}</p>
        </div>
    );
}

export default function Dashboard({
    stats,
    statusCounts,
    weeklyCompleted,
    upcomingDeadlines,
    recentTasks,
    events,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const chartLabels = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));

        return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date);
    });
    const chartOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Poppins, sans-serif' },
        colors: ['#2d875c'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.04, stops: [0, 100] } },
        grid: { borderColor: '#edf3ef', strokeDashArray: 4 },
        xaxis: { categories: chartLabels, labels: { style: { colors: '#8aa097', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
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

    return (
        <>
            <Head title="Dashboard" />
            <main className="min-h-[calc(100svh-68px)] bg-[#f8faf7]">
                <div className="mx-auto max-w-[1540px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-4 lg:hidden"><AppLogo /></div>
                            <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[#5c9072] uppercase">Ruang kerja pribadi</p>
                            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30] sm:text-4xl">Selamat datang kembali, {auth.user?.name ?? 'kamu'}</h1>
                            <p className="mt-2 text-sm leading-6 text-[#71877b]">Ringkasan pekerjaan dan agenda yang perlu kamu perhatikan hari ini.</p>
                        </div>
                        <Link href={tasksIndex()} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full bg-[#2d875c] px-4 text-xs font-semibold text-white transition hover:bg-[#236d49] sm:self-auto">Lihat semua task <ArrowUpRight className="size-4" /></Link>
                    </header>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Total task" value={stats.total} detail="Semua task milikmu" icon={ListChecks} tone="green" />
                        <StatCard label="Sedang dikerjakan" value={stats.in_progress} detail="Butuh fokus berikutnya" icon={Clock3} tone="blue" />
                        <StatCard label="Selesai" value={stats.completed} detail="Task berstatus Done" icon={CheckCircle2} tone="green" />
                        <StatCard label="Terlambat" value={stats.overdue} detail={`${stats.calendar_events} agenda mendatang`} icon={AlertCircle} tone="red" />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
                        <div className="rounded-2xl border border-[#dfeae3] bg-white p-5 shadow-[0_8px_24px_rgba(33,84,62,0.04)] sm:p-6">
                            <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-[#173d30]">Progres 7 hari terakhir</h2><p className="mt-1 text-xs text-[#8aa097]">Jumlah task yang selesai setiap hari.</p></div><span className="rounded-full bg-[#eaf6ee] px-3 py-1 text-[11px] font-semibold text-[#2d875c]">Minggu ini</span></div>
                            <div className="mt-5"><Chart options={chartOptions} series={[{ name: 'Task selesai', data: weeklyCompleted }]} type="area" height={270} /></div>
                        </div>
                        <div className="rounded-2xl border border-[#dfeae3] bg-white p-5 shadow-[0_8px_24px_rgba(33,84,62,0.04)] sm:p-6">
                            <div><h2 className="text-base font-semibold text-[#173d30]">Distribusi status</h2><p className="mt-1 text-xs text-[#8aa097]">Posisi task saat ini.</p></div>
                            <Chart options={donutOptions} series={[statusCounts.todo, statusCounts.in_progress, statusCounts.review, statusCounts.done]} type="donut" height={280} />
                        </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-2">
                        <DashboardList title="Deadline terdekat" subtitle="Task yang perlu diselesaikan lebih dulu." action="Lihat semua" href={tasksIndex()}>
                            {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 border-b border-[#eef3ef] py-3 last:border-b-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#173d30]">{task.title}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[task.status]}`}>{statusLabels[task.status]}</span></div><span className="shrink-0 text-xs font-medium text-[#71877b]">{formatDate(task.due_date)}</span></div>) : <EmptyText text="Belum ada deadline terdekat." />}
                        </DashboardList>
                        <DashboardList title="Agenda mendatang" subtitle="Agenda kalender pribadi dalam 14 hari." action="Buka kalender" href={calendarIndex()}>
                            {events.length > 0 ? events.map((event) => <div key={event.id} className="flex items-center gap-3 border-b border-[#eef3ef] py-3 last:border-b-0"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} /><p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#173d30]">{event.title}</p><span className="shrink-0 text-xs text-[#71877b]">{formatDate(event.event_date)}</span></div>) : <EmptyText text="Belum ada agenda mendatang." />}
                        </DashboardList>
                    </section>

                    <div className="rounded-2xl border border-[#dfeae3] bg-white p-5 shadow-[0_8px_24px_rgba(33,84,62,0.04)] sm:p-6">
                        <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-[#173d30]">Aktivitas task terbaru</h2><p className="mt-1 text-xs text-[#8aa097]">Perubahan terakhir pada task milikmu.</p></div><Link href={tasksIndex()} className="text-xs font-semibold text-[#2d875c] hover:underline">Kelola task</Link></div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{recentTasks.length > 0 ? recentTasks.map((task) => <div key={task.id} className="rounded-xl border border-[#eef3ef] bg-[#fbfcfb] p-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[task.status]}`}>{statusLabels[task.status]}</span><p className="mt-3 line-clamp-2 text-xs leading-5 font-semibold text-[#173d30]">{task.title}</p><p className="mt-2 text-[10px] text-[#8aa097]">{formatRelativeDate(task.updated_at)}</p></div>) : <EmptyText text="Belum ada aktivitas task." />}</div>
                    </div>
                </div>
            </main>
        </>
    );
}

function DashboardList({ title, subtitle, action, href, children }: { title: string; subtitle: string; action: string; href: DashboardLink; children: React.ReactNode }) {
    return <div className="rounded-2xl border border-[#dfeae3] bg-white p-5 shadow-[0_8px_24px_rgba(33,84,62,0.04)] sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-[#173d30]">{title}</h2><p className="mt-1 text-xs text-[#8aa097]">{subtitle}</p></div><Link href={href} className="text-xs font-semibold text-[#2d875c] hover:underline">{action}</Link></div><div className="mt-4">{children}</div></div>;
}

function EmptyText({ text }: { text: string }) {
    return <p className="py-8 text-center text-sm text-[#8aa097]">{text}</p>;
}

Dashboard.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }] };
