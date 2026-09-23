<?php

namespace App\Models;

use Database\Factories\TaskActivityLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'action', 'metadata', 'created_at'])]
class TaskActivityLog extends Model
{
    /** @use HasFactory<TaskActivityLogFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Scope activity logs through their task owner.
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
