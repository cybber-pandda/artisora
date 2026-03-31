<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Driver's proof-of-delivery photo
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('proof_path')->nullable()->after('delivered_at');
            $table->timestamp('proof_at')->nullable()->after('proof_path');
        });

        // Buyer's delivery experience rating + auto-complete tracking
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedTinyInteger('delivery_experience_rating')->nullable()->after('meetup_completed_at');
            $table->string('delivery_experience_comment', 500)->nullable()->after('delivery_experience_rating');
            $table->timestamp('delivery_completed_at')->nullable()->after('delivery_experience_comment');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['proof_path', 'proof_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_experience_rating', 'delivery_experience_comment', 'delivery_completed_at']);
        });
    }
};
