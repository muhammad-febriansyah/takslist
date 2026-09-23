import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-1', className)}
            classNames={{
                months: 'flex flex-col sm:flex-row gap-2',
                month: 'space-y-4',
                month_caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-semibold text-[#173d30]',
                nav: 'flex items-center gap-1',
                button_previous:
                    'absolute left-1 size-8 rounded-lg text-[#557067] transition hover:bg-[#f3f8f5] hover:text-[#173d30]',
                button_next:
                    'absolute right-1 size-8 rounded-lg text-[#557067] transition hover:bg-[#f3f8f5] hover:text-[#173d30]',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday:
                    'w-9 rounded-md text-[11px] font-medium text-[#8aa097]',
                week: 'mt-2 flex w-full',
                day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
                day_button:
                    'size-9 rounded-lg p-0 font-normal text-[#557067] transition hover:bg-[#f3f8f5] hover:text-[#173d30] aria-selected:bg-[#2d875c] aria-selected:text-white aria-selected:hover:bg-[#236d49]',
                today: 'bg-[#edf8f1] font-semibold text-[#236d49]',
                outside: 'text-[#b6c4bb] opacity-50',
                disabled: 'text-[#c9d6ce] opacity-50',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, ...props }) =>
                    orientation === 'left' ? (
                        <ChevronLeft className="size-4" {...props} />
                    ) : (
                        <ChevronRight className="size-4" {...props} />
                    ),
            }}
            {...props}
        />
    );
}

export { Calendar };
