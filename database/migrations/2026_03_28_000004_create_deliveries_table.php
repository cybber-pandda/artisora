<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();

            // Parent order (1-to-1)
            $table->foreignId('order_id')->unique()->constrained('orders')->cascadeOnDelete();

            // Parties
            $table->foreignId('artist_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();

            // Dispatch type
            $table->enum('type', ['private', 'public'])->default('public');

            // Delivery lifecycle status
            $table->enum('status', [
                'pending_driver',   // created, waiting for driver
                'searching',        // published to marketplace
                'picked_up',        // driver has the artwork
                'in_transit',       // on the way to buyer
                'delivered',        // completed
            ])->default('pending_driver');

            // Artwork logistics info (copied from art post at dispatch time)
            $table->string('dimensions')->nullable();   // L × W × H
            $table->decimal('weight', 8, 2)->nullable(); // kg
            $table->unsignedInteger('buffer_time')->default(30); // minutes

            // Map coordinates – artist pickup point
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();

            // Map coordinates – buyer drop-off point (derived from order address / geocoded)
            $table->decimal('dropoff_lat', 10, 7)->nullable();
            $table->decimal('dropoff_lng', 10, 7)->nullable();

            // Live driver location (updated by driver app / polling)
            $table->decimal('driver_lat', 10, 7)->nullable();
            $table->decimal('driver_lng', 10, 7)->nullable();

            // ETA (set when driver claims/accepts)
            $table->timestamp('estimated_arrival_at')->nullable();

            // Lifecycle timestamps
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
