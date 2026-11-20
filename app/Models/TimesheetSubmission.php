<?php

namespace App\Models;

use Database\Factories\TimesheetSubmissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'period', 'status', 'department', 'client', 'approved_by', 'approved_role', 'signature_path', 'edited_rows', 'submitted_at'])]
class TimesheetSubmission extends Model
{
    /** @use HasFactory<TimesheetSubmissionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'edited_rows' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
