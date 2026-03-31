<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetup_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // Consent flags — tracking only visible if BOTH parties consent
            $table->boolean('buyer_consented')->default(false);
            $table->boolean('artist_consented')->default(false);

            // Ephemeral location — each update OVERWRITES the previous row's coords
            // (no history stored)
            $table->decimal('buyer_lat',  10, 7)->nullable();
            $table->decimal('buyer_lng',  10, 7)->nullable();
            $table->timestamp('buyer_updated_at')->nullable();

            $table->decimal('artist_lat', 10, 7)->nullable();
            $table->decimal('artist_lng', 10, 7)->nullable();
            $table->timestamp('artist_updated_at')->nullable();

            $table->enum('status', ['idle', 'active', 'ended'])->default('idle');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetup_sessions');
    }
};
