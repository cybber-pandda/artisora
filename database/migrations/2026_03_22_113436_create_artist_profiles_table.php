<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artist_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('display_name', 100);
            $table->string('phone_number', 20)->nullable();
            $table->string('gcash_number', 20)->nullable();
            $table->text('bio')->nullable();
            $table->string('specialty', 100)->nullable(); // e.g. oil, watercolor, digital
            $table->string('portfolio_url')->nullable();
            $table->string('instagram_handle', 100)->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('profile_photo_path')->nullable();
            $table->string('cover_photo_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artist_profiles');
    }
};