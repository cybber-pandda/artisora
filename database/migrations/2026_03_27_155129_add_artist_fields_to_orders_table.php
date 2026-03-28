<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Which artist this order belongs to (for quick querying on artist dashboard)
            $table->foreignId('artist_id')
                  ->nullable()
                  ->after('buyer_id')
                  ->constrained('users')
                  ->nullOnDelete();

            // Artist response fields
            $table->text('decline_reason')->nullable()->after('status');
            $table->timestamp('responded_at')->nullable()->after('decline_reason');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['artist_id']);
            $table->dropColumn(['artist_id', 'decline_reason', 'responded_at']);
        });
    }
};
