<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artist_profiles', function (Blueprint $table) {
            $table->decimal('pickup_lat', 10, 7)->nullable()->after('meetup_radius_km');
            $table->decimal('pickup_lng', 10, 7)->nullable()->after('pickup_lat');
            $table->string('pickup_location_label')->nullable()->after('pickup_lng');
        });
    }

    public function down(): void
    {
        Schema::table('artist_profiles', function (Blueprint $table) {
            $table->dropColumn(['pickup_lat', 'pickup_lng', 'pickup_location_label']);
        });
    }
};
