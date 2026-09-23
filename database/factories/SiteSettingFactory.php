<?php

namespace Database\Factories;

use App\Models\SiteSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SiteSetting>
 */
class SiteSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'site_name' => 'TaskFlow',
            'keyword' => 'manajemen task dan kolaborasi',
            'tagline' => 'Ruang kerja yang lebih teratur.',
            'logo_path' => null,
            'favicon_path' => null,
            'updated_by' => null,
        ];
    }
}
