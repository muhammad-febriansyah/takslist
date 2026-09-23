<?php

namespace App\Models;

use Database\Factories\SubtaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'title', 'is_completed', 'sort_order', 'completed_at'])]
class Subtask extends Model
{
    /** @use HasFactory<SubtaskFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'sort_order' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Scope subtasks through their task owner.
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
