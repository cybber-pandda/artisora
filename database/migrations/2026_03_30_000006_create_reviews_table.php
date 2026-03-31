<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('art_post_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('artist_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');         // 1–5 stars
            $table->text('comment')->nullable();           // written review
            $table->string('photo_path')->nullable();      // optional product photo (S3)
            $table->timestamps();

            $table->unique(['order_id', 'order_item_id', 'buyer_id'], 'unique_review_per_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
