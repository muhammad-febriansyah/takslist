<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $siteSettings = SiteSetting::current();

        return [
            ...parent::share($request),
            'name' => $siteSettings->site_name,
            'siteSettings' => $siteSettings->toPublicArray(),
            'auth' => [
                'user' => $request->user(),
            ],
            'notifications' => $this->notifications($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Read persisted notifications without exposing another user's private data.
     *
     * @return list<array{id: string, type: string, title: string, message: string, href: string, created_at: string}>
     */
    private function notifications(Request $request): array
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return [];
        }

        return $user->notifications()
            ->whereNull('read_at')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (DatabaseNotification $notification): array => [
                'id' => (string) $notification->id,
                'type' => $notification->data['type'] ?? 'info',
                'title' => $notification->data['title'] ?? 'Notifikasi',
                'message' => $notification->data['message'] ?? '',
                'href' => $notification->data['href'] ?? route('dashboard'),
                'created_at' => $notification->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}
