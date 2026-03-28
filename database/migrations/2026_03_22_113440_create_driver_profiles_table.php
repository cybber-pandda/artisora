<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('phone_number', 20);
            $table->string('vehicle_type', 50);    // motorcycle, car, van
            $table->string('plate_number', 20);
            $table->string('license_image_path');  // stored in R2
            $table->string('license_number', 50)->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('city_coverage', 100)->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_profiles');
    }
};