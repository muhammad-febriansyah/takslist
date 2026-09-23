import { Form, Head, router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as calendarIndex } from '@/routes/calendar';
import { store as storeCalendarEvent } from '@/routes/calendar/events';

type CalendarEvent = {
    id: number;
    title: string;
    description: string | null;
    event_date: string | null;
    color: string;
};

type Props = {
    month: string;
    events: CalendarEvent[];
};

const presetColors = ['#2D875C', '#D88B20', '#4F7CAC', '#A855F7', '#D44F4F'];

function getTodayValue(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getCalendarCells(month: string): Array<string | null> {
    const [year, monthNumber] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
        const day = index - leadingDays + 1;

        if (day < 1 || day > daysInMonth) {
            return null;
        }

        return `${month}-${String(day).padStart(2, '0')}`;
    });
}

function formatMonth(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, monthNumber - 1, 1));
}

export default function Calendar({ month, events }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayValue);
    const [selectedColor, setSelectedColor] = useState(presetColors[0]);
    const cells = getCalendarCells(month);
    const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>(
        (grouped, event) => {
            if (event.event_date) {
                grouped[event.event_date] ??= [];
                grouped[event.event_date].push(event);
            }

            return grouped;
        },
        {},
    );

    function changeMonth(offset: number): void {
        const [year, monthNumber] = month.split('-').map(Number);
        const nextMonth = new Date(year, monthNumber - 1 + offset, 1);
        const nextValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        router.get(
            calendarIndex({ query: { month: nextValue } }).url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function goToToday(): void {
        const today = getTodayValue().slice(0, 7);

        router.get(
            calendarIndex({ query: { month: today } }).url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function openCreateDialog(date = getTodayValue()): void {
        setSelectedDate(date);
        setSelectedColor(presetColors[0]);
        setIsCreateOpen(true);
    }

    return (
        <>
            <Head title="Calendar" />
            <main className="min-h-[calc(100svh-68px)] bg-[#f8faf7]">
                <div className="mx-auto max-w-[1540px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[#5c9072] uppercase">
                                Dashboard / Calendar
                            </p>
                            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.04em] text-[#173d30]">
                                Calendar
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-[#71877b]">
                                Lihat agenda pribadimu berdasarkan tanggal.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => openCreateDialog()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d875c] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#236d49]"
                        >
                            <Plus className="size-4" />
                            Agenda baru
                        </button>
                    </header>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#dfeae3] bg-white px-4 py-3 text-xs text-[#71877b]">
                        <span className="font-semibold text-[#557067]">
                            Warna agenda
                        </span>
                        {presetColors.map((color) => (
                            <span
                                key={color}
                                className="inline-flex items-center gap-2"
                            >
                                <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                            </span>
                        ))}
                        <span>Pilih warna bebas saat membuat agenda.</span>
                    </div>

                    <section className="overflow-hidden rounded-2xl border border-[#dfeae3] bg-white shadow-[0_1px_2px_rgba(23,61,48,0.03)]">
                        <div className="flex flex-col gap-4 border-b border-[#eaf1ec] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-[#eaf6ee] text-[#2d875c]">
                                    <CalendarDays className="size-4" />
                                </div>
                                <h2 className="text-base font-semibold text-[#173d30] capitalize">
                                    {formatMonth(month)}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={goToToday}
                                    className="h-9 rounded-lg border border-[#dfeae3] px-3 text-xs font-semibold text-[#557067] transition hover:bg-[#f3f8f5]"
                                >
                                    Hari ini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeMonth(-1)}
                                    className="flex size-9 items-center justify-center rounded-lg border border-[#dfeae3] text-[#557067] transition hover:bg-[#f3f8f5]"
                                    aria-label="Bulan sebelumnya"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeMonth(1)}
                                    className="flex size-9 items-center justify-center rounded-lg border border-[#dfeae3] text-[#557067] transition hover:bg-[#f3f8f5]"
                                    aria-label="Bulan berikutnya"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                        <div className="min-w-[760px] overflow-x-auto">
                            <div className="grid grid-cols-7 border-b border-[#eaf1ec] bg-[#f8faf7]">
                                {[
                                    'Sen',
                                    'Sel',
                                    'Rab',
                                    'Kam',
                                    'Jum',
                                    'Sab',
                                    'Min',
                                ].map((day) => (
                                    <div
                                        key={day}
                                        className="px-3 py-3 text-center text-[11px] font-semibold text-[#71877b]"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {cells.map((date, index) => {
                                    const dateEvents = date
                                        ? (eventsByDate[date] ?? [])
                                        : [];

                                    return (
                                        <div
                                            key={date ?? `empty-${index}`}
                                            className={`min-h-[138px] border-r border-b border-[#eaf1ec] p-2.5 last:border-r-0 ${date ? 'cursor-pointer transition hover:bg-[#fbfdfb]' : ''}`}
                                            onClick={() =>
                                                date && openCreateDialog(date)
                                            }
                                        >
                                            {date && (
                                                <>
                                                    <div
                                                        className={`mb-2 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${date === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` ? 'bg-[#2d875c] text-white' : 'text-[#557067]'}`}
                                                    >
                                                        {Number(date.slice(-2))}
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        {dateEvents
                                                            .slice(0, 3)
                                                            .map((event) => (
                                                                <div
                                                                    key={
                                                                        event.id
                                                                    }
                                                                    className="truncate rounded-md border border-l-4 px-2 py-1.5 text-[10px] font-medium text-[#355347]"
                                                                    style={{
                                                                        borderColor: `${event.color}55`,
                                                                        borderLeftColor:
                                                                            event.color,
                                                                        backgroundColor: `${event.color}18`,
                                                                    }}
                                                                    title={
                                                                        event.description ??
                                                                        event.title
                                                                    }
                                                                >
                                                                    {
                                                                        event.title
                                                                    }
                                                                </div>
                                                            ))}
                                                        {dateEvents.length >
                                                            3 && (
                                                            <span className="px-1 text-[10px] font-semibold text-[#71877b]">
                                                                +
                                                                {dateEvents.length -
                                                                    3}{' '}
                                                                agenda lain
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="border-[#dfeae3] bg-white sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Tambah agenda
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Buat agenda pribadi dan pilih warna penandanya.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...storeCalendarEvent.form()}
                        resetOnSuccess
                        onSuccess={() => {
                            setIsCreateOpen(false);
                            setSelectedColor(presetColors[0]);
                        }}
                        onError={() => toast.error('Agenda gagal dibuat.')}
                        className="space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="calendar-event-title">
                                        Nama agenda
                                    </Label>
                                    <Input
                                        id="calendar-event-title"
                                        name="title"
                                        required
                                        autoFocus
                                        placeholder="Contoh: Mancing sore"
                                    />
                                    <InputError message={errors.title} />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="calendar-event-date">
                                            Tanggal
                                        </Label>
                                        <input
                                            type="hidden"
                                            id="calendar-event-date"
                                            name="event_date"
                                            value={selectedDate}
                                        />
                                        <DatePicker
                                            value={selectedDate}
                                            onChange={setSelectedDate}
                                        />
                                        <InputError
                                            message={errors.event_date}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="calendar-event-color">
                                        Warna agenda
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="calendar-event-color"
                                            name="color"
                                            type="color"
                                            value={selectedColor}
                                            onChange={(event) =>
                                                setSelectedColor(
                                                    event.target.value.toUpperCase(),
                                                )
                                            }
                                            className="size-10 cursor-pointer rounded-lg border border-[#dfeae3] bg-white p-1"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {presetColors.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    aria-label={`Pilih warna ${color}`}
                                                    onClick={() =>
                                                        setSelectedColor(color)
                                                    }
                                                    className={`size-7 rounded-full border-2 border-white shadow-sm ring-1 ring-[#dfeae3] transition hover:scale-105 ${selectedColor === color ? 'ring-2 ring-[#173d30]' : ''}`}
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="font-mono text-xs text-[#71877b]">
                                            {selectedColor}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="calendar-event-description">
                                        Catatan
                                    </Label>
                                    <textarea
                                        id="calendar-event-description"
                                        name="description"
                                        rows={3}
                                        placeholder="Contoh: Bawa umpan dan kursi lipat."
                                        className="w-full resize-none rounded-lg border border-[#dfeae3] bg-white px-3 py-2.5 text-sm leading-5 text-[#173d30] outline-none placeholder:text-[#9aac9f] focus:border-[#7cba95] focus:ring-2 focus:ring-[#7cba95]/20"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="border-[#dfeae3] text-[#557067]"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-[#2d875c] text-white hover:bg-[#236d49]"
                                    >
                                        {processing
                                            ? 'Menyimpan...'
                                            : 'Simpan agenda'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Calendar.layout = {
    breadcrumbs: [
        {
            title: 'Calendar',
            href: calendarIndex(),
        },
    ],
};
