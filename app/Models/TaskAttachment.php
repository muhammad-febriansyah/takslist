<?php

namespace App\Models;

use Database\Factories\TaskAttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_id', 'original_name', 'disk', 'path', 'mime_type', 'size'])]
class TaskAttachment extends Model
{
    /** @use HasFactory<TaskAttachmentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    /**
     * Scope attachments through their task owner.
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
