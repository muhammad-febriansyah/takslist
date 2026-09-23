<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $createUser = function (string $name, string $email, string $role, ?int $supervisorId = null): User {
            $user = User::query()->firstOrNew(['email' => $email]);
            $user->forceFill([
                'name' => $name,
                'role' => $role,
                'supervisor_id' => $supervisorId,
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]);
            $user->save();

            return $user;
        };

        $createUser('Admin TaskFlow', 'admin@taskflow.id', 'admin');
        $atasan = $createUser('Atasan TaskFlow', 'atasan@taskflow.id', 'atasan');
        $createUser('Bawahan TaskFlow', 'bawahan@taskflow.id', 'bawahan', $atasan->id);

        $createUser('Test User', 'test@example.com', 'bawahan', $atasan->id);
    }
}
