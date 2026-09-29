import type { PropsWithChildren } from 'react';

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="mx-auto w-full max-w-[1540px] px-4 pt-8 pb-16 sm:px-6 sm:pb-20 lg:px-10">
            {children}
        </div>
    );
}
