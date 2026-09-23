import { Check } from 'lucide-react';

type Props = {
    logoUrl?: string | null;
};

export default function AppLogo({ logoUrl = null }: Props) {
    return (
        <div className="flex items-center">
            <div className={'flex items-center justify-center overflow-hidden ' + (logoUrl ? 'h-14 w-40 rounded-none bg-transparent shadow-none' : 'size-8 rounded-[10px] bg-[#2d875c] text-white shadow-sm shadow-[#2d875c]/20')}>
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="size-full object-contain" />
                ) : (
                    <Check className="size-[18px] stroke-[3]" />
                )}
            </div>
        </div>
    );
}
