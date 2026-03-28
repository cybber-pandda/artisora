<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('art_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('medium', 100)->nullable();    // Oil, Watercolor, etc.
            $table->string('dimensions', 100)->nullable(); // e.g. 24×36 in
            $table->decimal('price', 10, 2)->nullable();   // null = not for sale
            $table->boolean('is_for_sale')->default(false);
            $table->boolean('is_sold')->default(false);
            $table->enum('status', ['draft', 'published'])->default('published');
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('art_posts');
    }
};