import { useFlashToast } from '@/hooks/use-flash-toast';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    useFlashToast();

    return (
        <Sonner
            theme="light"
            richColors
            className="toaster group"
            position="bottom-right"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--success-bg': '#eaf6ee',
                    '--success-text': '#236d49',
                    '--success-border': '#b7dec4',
                    '--warning-bg': '#fff5df',
                    '--warning-text': '#b96f0a',
                    '--warning-border': '#f0d59e',
                    '--error-bg': '#fff0f0',
                    '--error-text': '#c53f3f',
                    '--error-border': '#f0baba',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
