<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('artist_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            // Each user can only follow an artist once
            $table->unique(['follower_id', 'artist_id']);

            // Index for feed queries: "get all artists this user follows"
            $table->index('follower_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};
