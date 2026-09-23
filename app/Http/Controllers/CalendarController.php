<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCalendarEventRequest;
use App\Models\CalendarEvent;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $month = $this->resolveMonth($request->string('month')->toString());
        $gridStart = $month->startOfMonth()->startOfWeek(CarbonImmutable::MONDAY);
        $gridEnd = $month->endOfMonth()->endOfWeek(CarbonImmutable::SUNDAY);

        $events = CalendarEvent::ownedBy($user)
            ->whereBetween('event_date', [$gridStart->toDateString(), $gridEnd->toDateString()])
            ->orderBy('event_date')
            ->orderBy('id')
            ->get(['id', 'title', 'description', 'event_date', 'color'])
            ->map(fn (CalendarEvent $event): array => [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'event_date' => $event->event_date?->toDateString(),
                'color' => $event->color,
            ])
            ->values();

        return Inertia::render('calendar/index', [
            'month' => $month->format('Y-m'),
            'events' => $events,
        ]);
    }

    public function store(StoreCalendarEventRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $event = new CalendarEvent($request->validated());
        $event->user()->associate($user);
        $event->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Agenda berhasil dibuat.']);

        return to_route('calendar.index');
    }

    private function resolveMonth(string $value): CarbonImmutable
    {
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value) === 1) {
            return CarbonImmutable::createFromFormat('!Y-m', $value);
        }

        return CarbonImmutable::now()->startOfMonth();
    }
}
