<?php

namespace App\Models;

use Database\Factories\SiteSettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['site_name', 'keyword', 'tagline', 'logo_path', 'favicon_path', 'updated_by'])]
class SiteSetting extends Model
{
    /** @use HasFactory<SiteSettingFactory> */
    use HasFactory;

    public static function current(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            [
                'site_name' => 'TaskFlow',
                'keyword' => 'manajemen task dan kolaborasi',
                'tagline' => 'Ruang kerja yang lebih teratur.',
            ],
        );
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return array<string, mixed> */
    public function toPublicArray(): array
    {
        $faviconPath = $this->favicon_path ?: $this->logo_path;
        $version = $this->updated_at?->timestamp;

        return [
            'site_name' => $this->site_name,
            'keyword' => $this->keyword,
            'tagline' => $this->tagline,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path).($version ? '?v='.$version : '') : null,
            'favicon_url' => $faviconPath ? Storage::disk('public')->url($faviconPath).($version ? '?v='.$version : '') : null,
        ];
    }
}
