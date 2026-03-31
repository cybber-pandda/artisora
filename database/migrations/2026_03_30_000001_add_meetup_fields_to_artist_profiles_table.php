<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artist_profiles', function (Blueprint $table) {
            // Human-readable name of the artist's default meet-up anchor
            $table->string('meetup_location_label')->nullable()->after('longitude');
            // How far the artist is willing to travel from their anchor (km)
            $table->decimal('meetup_radius_km', 5, 1)->nullable()->default(10)->after('meetup_location_label');
        });
    }

    public function down(): void
    {
        Schema::table('artist_profiles', function (Blueprint $table) {
            $table->dropColumn(['meetup_location_label', 'meetup_radius_km']);
        });
    }
};
