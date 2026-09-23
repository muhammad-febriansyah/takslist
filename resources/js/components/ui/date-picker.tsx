import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseDateValue(value: string): Date | undefined {
    return value ? parseISO(value.length === 7 ? `${value}-01` : value) : undefined;
}

function formatDateValue(value: string, monthOnly: boolean): string {
    const date = parseDateValue(value);

    return date
        ? format(date, monthOnly ? 'MMMM yyyy' : 'd MMMM yyyy', { locale: id })
        : 'Pilih tanggal';
}

export function DatePicker({
    value,
    onChange,
    placeholder = 'Pilih tanggal',
    monthOnly = false,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    monthOnly?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => parseDateValue(value) ?? new Date());

    if (monthOnly) {
        return (
            <Popover
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);

                    if (nextOpen) {
                        setVisibleMonth(parseDateValue(value) ?? new Date());
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-[#dfeae3] px-3 text-left text-sm font-normal text-[#173d30] shadow-none hover:bg-[#f8faf7] hover:text-[#173d30]"
                    >
                        <span className={value ? 'truncate' : 'truncate text-[#9aac9f]'}>
                            {value ? formatDateValue(value, true) : placeholder}
                        </span>
                        <CalendarDays className="size-4 shrink-0 text-[#71877b]" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3" align="start">
                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-[#557067] hover:bg-[#f3f8f5]"
                            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1))}
                            aria-label="Tahun sebelumnya"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <span className="text-sm font-semibold text-[#315847]">{format(visibleMonth, 'yyyy')}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-[#557067] hover:bg-[#f3f8f5]"
                            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1))}
                            aria-label="Tahun berikutnya"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                            const month = new Date(visibleMonth.getFullYear(), monthIndex, 1);
                            const monthValue = format(month, 'yyyy-MM-01');
                            const isSelected = value.slice(0, 7) === monthValue.slice(0, 7);

                            return (
                                <Button
                                    key={monthValue}
                                    type="button"
                                    variant="ghost"
                                    className={cn(
                                        'h-9 rounded-lg text-xs font-medium text-[#557067] hover:bg-[#f3f8f5] hover:text-[#236d49]',
                                        isSelected && 'bg-[#e7f4eb] text-[#28754d] hover:bg-[#e7f4eb] hover:text-[#28754d]',
                                    )}
                                    onClick={() => {
                                        onChange(monthValue);
                                        setOpen(false);
                                    }}
                                >
                                    {format(month, 'MMM', { locale: id })}
                                </Button>
                            );
                        })}
                    </div>
                    <div className="mt-3 border-t border-[#eaf1ec] pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 w-full rounded-lg text-xs font-semibold text-[#2d875c] hover:bg-[#f3f8f5] hover:text-[#236d49]"
                            onClick={() => {
                                const today = new Date();
                                onChange(format(today, 'yyyy-MM-01'));
                                setOpen(false);
                            }}
                        >
                            Bulan ini
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-between rounded-xl border-[#dfeae3] px-3 text-left text-sm font-normal text-[#173d30] hover:bg-[#f8faf7]"
                >
                    <span className={value ? 'truncate' : 'text-[#9aac9f]'}>
                        {value ? formatDateValue(value, monthOnly) : placeholder}
                    </span>
                    <CalendarDays className="size-4 shrink-0 text-[#71877b]" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                    mode="single"
                    defaultMonth={parseDateValue(value) ?? new Date()}
                    selected={parseDateValue(value)}
                    onSelect={(date) => {
                        if (date) {
                            onChange(
                                format(date, 'yyyy-MM-dd'),
                            );
                            setOpen(false);
                        }
                    }}
                />
                <div className="mt-2 border-t border-[#eaf1ec] pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full rounded-lg text-xs font-semibold text-[#2d875c] hover:bg-[#f3f8f5] hover:text-[#236d49]"
                        onClick={() => {
                            const today = new Date();

                            onChange(
                                format(today, 'yyyy-MM-dd'),
                            );
                            setOpen(false);
                        }}
                    >
                        Hari ini
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
