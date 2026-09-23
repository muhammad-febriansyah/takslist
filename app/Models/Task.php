<?php

namespace App\Models;

use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\Pivot;

#[Fillable(['user_id', 'project_id', 'title', 'description', 'status', 'priority', 'start_date', 'due_date', 'sort_order', 'completed_at', 'external_source', 'external_ticket_id', 'external_ticket_number', 'external_status', 'external_assignee_name'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'sort_order' => 'integer',
            'completed_at' => 'datetime',
            'external_ticket_id' => 'integer',
        ];
    }

    /**
     * Scope tasks to records owned by the given user.
     */
    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->whereBelongsTo($user);
    }

    /**
     * Scope tasks visible to the current role without exposing other users' private tasks.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($user): void {
            $query->where('user_id', $user->id);

            if ($user->isAtasan()) {
                $query->orWhereHas('user', fn (Builder $userQuery): Builder => $userQuery->where('supervisor_id', $user->id));
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return HasMany<Subtask, $this> */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class);
    }

    /** @return HasMany<TaskAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    /** @return HasMany<TaskActivityLog, $this> */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(TaskActivityLog::class);
    }

    /** @return HasMany<TaskReminder, $this> */
    public function reminders(): HasMany
    {
        return $this->hasMany(TaskReminder::class);
    }

    /** @return HasMany<TaskReview, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(TaskReview::class);
    }

    /** @return HasOne<TaskReview, $this> */
    public function latestReview(): HasOne
    {
        return $this->hasOne(TaskReview::class)
            ->latestOfMany()
            ->select('task_reviews.*');
    }

    /** @return BelongsToMany<Tag, $this, Pivot, 'pivot'> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'task_tag');
    }
}
