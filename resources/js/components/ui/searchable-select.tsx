import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
    value: string;
    label: string;
    description?: string | null;
};

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih data',
    searchPlaceholder = 'Cari data...',
    emptyMessage = 'Data tidak ditemukan.',
    disabled = false,
    'aria-label': ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    'aria-label'?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) =>
            `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedQuery),
        );
    }, [options, query]);

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    setQuery('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-label={ariaLabel}
                    aria-expanded={open}
                    className="h-[52px] w-full justify-between rounded-2xl border-[#d5e5da] bg-white px-4 text-left text-sm font-normal text-[#113524] shadow-none hover:bg-[#fbfdfb] hover:text-[#113524] focus-visible:border-[#55906a] focus-visible:ring-4 focus-visible:ring-[#eaf2ec]"
                >
                    <span className={cn('truncate', !selectedOption && 'text-[#225e3d]/35')}>
                        {selectedOption?.label ?? (options.length ? placeholder : 'Belum ada atasan aktif')}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-[#225e3d]/55" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-2" align="start">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8aa097]" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        autoFocus
                        className="h-9 rounded-lg border-[#dfeae3] pl-9 text-xs shadow-none focus-visible:border-[#72b68a] focus-visible:ring-2 focus-visible:ring-[#dcefe2]"
                    />
                </div>
                <div className="mt-2 max-h-52 overflow-y-auto">
                    {filteredOptions.length ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[#315847] outline-none hover:bg-[#f3f8f5] focus-visible:bg-[#f3f8f5]"
                            >
                                <Check className={cn('size-4 shrink-0 text-[#2d875c]', option.value === value ? 'opacity-100' : 'opacity-0')} />
                                <span className="min-w-0">
                                    <span className="block truncate">{option.label}</span>
                                    {option.description && <span className="block truncate text-xs text-[#8aa097]">{option.description}</span>}
                                </span>
                            </button>
                        ))
                    ) : (
                        <p className="px-2.5 py-3 text-xs text-[#8aa097]">{emptyMessage}</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
