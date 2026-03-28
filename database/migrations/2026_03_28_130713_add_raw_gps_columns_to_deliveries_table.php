<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            // Raw (unfiltered) GPS coordinates for audit/debugging
            $table->decimal('raw_driver_lat', 10, 7)->nullable()->after('driver_lng');
            $table->decimal('raw_driver_lng', 10, 7)->nullable()->after('raw_driver_lat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['raw_driver_lat', 'raw_driver_lng']);
        });
    }
};
