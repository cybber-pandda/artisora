<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();

            // Contact
            $table->string('full_name');
            $table->string('email');
            $table->string('phone_number');

            // Delivery method: meetup | delivery | pickup
            $table->enum('delivery_method', ['meetup', 'delivery', 'pickup']);

            // Address / meetup details (required for delivery; optional note for meetup/pickup)
            $table->string('address_line')->nullable();
            $table->string('city')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('meetup_location')->nullable();    // for meetup
            $table->text('notes')->nullable();               // any extra instruction

            // Payment method: gcash | cod
            $table->enum('payment_method', ['gcash', 'cod']);
            $table->string('gcash_number', 20)->nullable();   // required when gcash

            // Order status
            $table->enum('status', ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'])
                  ->default('pending');

            // Totals
            $table->decimal('subtotal', 10, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
