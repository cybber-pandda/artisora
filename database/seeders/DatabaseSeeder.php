<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // ── Admin ──────────────────────────────────────────────────
        User::create([
            'name'        => 'Admin User',
            'email'       => 'admin@example.com',
            'password'    => Hash::make('password'),
            'role'        => 'admin',
            'is_verified' => true,
        ]);

        // ── Artist (Sorsogon City) ─────────────────────────────────
        $artist = User::create([
            'name'        => 'Artist User',
            'email'       => 'artist@example.com',
            'password'    => Hash::make('password'),
            'role'        => 'artist',
            'is_verified' => true,
        ]);
        $artist->artistProfile()->create([
            'display_name'  => 'Juan Arts',
            'phone_number'  => '09171234567',
            'gcash_number'  => '09171234567',
            'bio'           => 'Oil painter from Sorsogon City.',
            'specialty'     => 'Oil Painting',
            // Sorsogon City coordinates — used as pickup on map
            'latitude'      => 12.9742,
            'longitude'     => 124.0058,
        ]);

        // ── Buyer (Quezon City) ────────────────────────────────────
        $buyer = User::create([
            'name'        => 'Buyer User',
            'email'       => 'buyer@example.com',
            'password'    => Hash::make('password'),
            'role'        => 'buyer',
            'is_verified' => true,
        ]);
        $buyer->buyerProfile()->create([
            'phone_number' => '09181234567',
            'address_line' => '123 Commonwealth Ave, Brgy. Holy Spirit',
            'city'         => 'Quezon City',
            'province'     => 'Metro Manila',
            'postal_code'  => '1127',
        ]);

        // ── Verified Driver (Metro Manila) ─────────────────────────
        $driver = User::create([
            'name'        => 'Driver User',
            'email'       => 'driver@example.com',
            'password'    => Hash::make('password'),
            'role'        => 'driver',
            'is_verified' => true,
        ]);
        $driver->driverProfile()->create([
            'phone_number'       => '09191234567',
            'vehicle_type'       => 'motorcycle',
            'plate_number'       => 'ABC 1234',
            'license_image_path' => 'driver-licenses/sample.jpg',
            'city_coverage'      => 'Metro Manila',
            'is_verified'        => true,
        ]);

        // ── Pending Driver (Cebu) ──────────────────────────────────
        $pending = User::create([
            'name'        => 'Pending Driver',
            'email'       => 'driver.pending@example.com',
            'password'    => Hash::make('password'),
            'role'        => 'driver',
            'is_verified' => false,
        ]);
        $pending->driverProfile()->create([
            'phone_number'       => '09201234567',
            'vehicle_type'       => 'van',
            'plate_number'       => 'XYZ 9999',
            'license_image_path' => 'driver-licenses/sample2.jpg',
            'city_coverage'      => 'Cebu City',
            'is_verified'        => false,
        ]);
    }
}