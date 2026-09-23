<?php

namespace App\Models;

use Database\Factories\TaskReminderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'remind_at', 'sent_at'])]
class TaskReminder extends Model
{
    /** @use HasFactory<TaskReminderFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    /**
     * Scope reminders through their task owner.
     */
    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->whereHas('task', fn (Builder $taskQuery): Builder => $taskQuery->whereBelongsTo($user));
    }

    /** @return BelongsTo<Task, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
