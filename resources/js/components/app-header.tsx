import { Link, router, usePage } from '@inertiajs/react';
import { type FormEvent, useEffect, useState } from 'react';
import {
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    Info,
    LayoutDashboard,
    ListTodo,
    Menu,
    Search,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';
import { index as calendarIndex } from '@/routes/calendar';
import { monitoring as adminMonitoring } from '@/routes/admin';
import { index as adminUsers } from '@/routes/admin/users';
import { edit as siteSettingsEdit } from '@/routes/site-settings';
import { index as tasksIndex } from '@/routes/tasks';
import { index as reviewsIndex } from '@/routes/reviews';
import { read as readNotification } from '@/routes/notifications';
import type { NotificationItem, SiteSettings, User } from '@/types';

type Props = {
    breadcrumbs?: unknown[];
};

const baseNavItems = [
    {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: dashboard(),
        path: dashboard.url(),
    },
    {
        title: 'Tasks',
        icon: ListTodo,
        href: tasksIndex(),
        path: tasksIndex.url(),
    },
    {
        title: 'Calendar',
        icon: CalendarDays,
        href: calendarIndex(),
        path: calendarIndex.url(),
    },
];

export function AppHeader(_props: Props) {
    const page = usePage<{
        auth: { user: User };
        siteSettings: SiteSettings;
        notifications?: NotificationItem[];
    }>();
    const { auth } = page.props;
    const siteSettings = page.props.siteSettings;
    const notifications = page.props.notifications ?? [];
    const [visibleNotifications, setVisibleNotifications] = useState(notifications);
    const getInitials = useInitials();
    const [search, setSearch] = useState('');

    useEffect(() => {
        setVisibleNotifications(notifications);
    }, [notifications]);

    function isNavItemActive(path?: string): boolean {
        if (!path) {
            return false;
        }

        if (path === adminMonitoring.url()) {
            return page.url === path;
        }

        return page.url === path || page.url.startsWith(`${path}/`);
    }

    function markNotificationRead(notification: NotificationItem): void {
        setVisibleNotifications((items) => items.filter((item) => item.id !== notification.id));
        router.patch(readNotification.url(notification.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => router.visit(notification.href),
        });
    }
    const navItems = [
        ...baseNavItems,
        ...(auth.user?.role === 'admin'
            ? [
                  {
                      title: 'Monitoring',
                      icon: LayoutDashboard,
                      href: adminMonitoring(),
                      path: adminMonitoring.url(),
                  },
                  {
                      title: 'Pengguna',
                      icon: Users,
                      href: adminUsers(),
                      path: adminUsers.url(),
                  },
                  {
                      title: 'Pengaturan',
                      icon: LayoutDashboard,
                      href: siteSettingsEdit(),
                      path: siteSettingsEdit.url(),
                  },
              ]
            : []),
        ...(auth.user?.role === 'atasan'
            ? [
                  {
                      title: 'Review Bawahan',
                      icon: ListTodo,
                      href: reviewsIndex(),
                      path: reviewsIndex.url(),
                  },
              ]
            : []),
    ];

    function submitSearch(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const value = search.trim();

        router.visit(tasksIndex.url(value ? { query: { search: value } } : undefined), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function notificationIcon(type: NotificationItem['type']): React.ReactNode {
        if (type === 'success') {
            return <CheckCircle2 className="size-4 text-[#2d875c]" />;
        }

        if (type === 'warning') {
            return <CircleAlert className="size-4 text-[#d88b20]" />;
        }

        if (type === 'error') {
            return <CircleAlert className="size-4 text-[#d44f4f]" />;
        }

        return <Info className="size-4 text-[#4f7cac]" />;
    }

    return (
        <header className="sticky top-0 z-40 border-b border-[#e4eee9] bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[68px] max-w-[1540px] items-center gap-5 px-4 sm:px-6 lg:px-10">
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-10"
                            >
                                <Menu className="size-5" />
                                <span className="sr-only">Open navigation</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 bg-white">
                            <SheetHeader>
                                <SheetTitle className="text-left">
                                    <AppLogo logoUrl={siteSettings.logo_url} />
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="mt-8 grid gap-2">
                                {navItems.map((item) => {
                                    const isActive = isNavItemActive(item.path);

                                    return item.href ? (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm ${isActive ? 'bg-[#e8f4ec] font-semibold text-[#17623e]' : 'font-medium text-[#557067] hover:bg-[#f4f8f5]'}`}
                                        >
                                            <item.icon className="size-4" />
                                            {item.title}
                                        </Link>
                                    ) : (
                                        <button
                                            key={item.title}
                                            type="button"
                                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#557067] hover:bg-[#f4f8f5]"
                                        >
                                            <item.icon className="size-4" />
                                            {item.title}
                                        </button>
                                    );
                                })}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                <Link href={dashboard()} prefetch className="shrink-0">
                    <AppLogo logoUrl={siteSettings.logo_url} />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => {
                        const isActive = isNavItemActive(item.path);

                        return item.href ? (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-colors ${isActive ? 'bg-[#e8f4ec] font-semibold text-[#17623e]' : 'font-medium text-[#557067] hover:bg-[#f4f8f5] hover:text-[#173d30]'}`}
                                >
                                <item.icon className="size-4" />
                                {item.title}
                            </Link>
                        ) : (
                            <button
                                key={item.title}
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium text-[#557067] transition-colors hover:bg-[#f4f8f5] hover:text-[#173d30]"
                            >
                                <item.icon className="size-4" />
                                {item.title}
                            </button>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2.5">
                    <form onSubmit={submitSearch} className="hidden xl:block">
                        <label className="flex h-10 w-[260px] items-center gap-2 rounded-full bg-[#f3f8f5] px-3.5 text-[#8aa097]">
                        <Search className="size-4" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari task atau agenda..."
                                aria-label="Cari task atau agenda"
                                className="min-w-0 flex-1 bg-transparent text-xs text-[#173d30] outline-none placeholder:text-[#8aa097]"
                            />
                        </label>
                    </form>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative size-10 rounded-xl text-[#557067] hover:bg-[#f3f8f5]"
                            >
                                <Bell className="size-[18px]" />
                                {visibleNotifications.length > 0 && (
                                    <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-[#e34f4f] ring-2 ring-white" />
                                )}
                                <span className="sr-only">Notifikasi</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[min(100vw,400px)] border-[#e4eee9] bg-white sm:max-w-[400px]">
                            <SheetHeader className="border-b border-[#eaf1ec] px-5 pb-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <SheetTitle className="text-left text-[#173d30]">Notifikasi</SheetTitle>
                                        <SheetDescription className="mt-1 text-left text-[#8aa097]">Info penting sesuai peranmu.</SheetDescription>
                                    </div>
                                    <span className="rounded-full bg-[#eaf6ee] px-2 py-1 text-[10px] font-semibold text-[#236d49]">
                                        {visibleNotifications.length}
                                    </span>
                                </div>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto px-3 py-4">
                                {visibleNotifications.length > 0 ? (
                                    visibleNotifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            onClick={() => markNotificationRead(notification)}
                                            className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f5faf6]"
                                        >
                                            <span className="mt-0.5 shrink-0">{notificationIcon(notification.type)}</span>
                                            <span className="min-w-0">
                                                <span className="block text-xs font-semibold text-[#173d30]">{notification.title}</span>
                                                <span className="mt-1 block text-[11px] leading-5 text-[#71877b]">{notification.message}</span>
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-3 py-12 text-center text-xs text-[#8aa097]">Belum ada notifikasi.</p>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-10 gap-2 rounded-xl px-1.5 pr-2 hover:bg-[#f3f8f5]"
                            >
                                <Avatar className="size-8">
                                    <AvatarImage
                                        src={auth.user?.avatar}
                                        alt={auth.user?.name}
                                    />
                                    <AvatarFallback className="bg-[#dcefe4] text-xs font-semibold text-[#256b45]">
                                        {getInitials(
                                            auth.user?.name ?? 'Task Flow',
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden text-left xl:block">
                                    <span className="block text-xs leading-tight font-semibold text-[#173d30]">
                                        {auth.user?.name ?? 'Pengguna'}
                                    </span>
                                    <span className="block text-[10px] text-[#8aa097]">
                                        {auth.user?.role === 'admin' ? 'Administrator' : auth.user?.role === 'atasan' ? 'Atasan' : 'Bawahan'}
                                    </span>
                                </span>
                                <ChevronDown className="hidden size-4 text-[#557067] xl:block" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            {auth.user && <UserMenuContent user={auth.user} />}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
