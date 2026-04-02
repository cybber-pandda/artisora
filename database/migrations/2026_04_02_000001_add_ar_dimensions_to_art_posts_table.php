<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('art_posts', function (Blueprint $table) {
            // Physical dimensions in centimetres — used to scale the AR canvas
            $table->decimal('physical_width_cm',  8, 2)->nullable()->after('dimensions');
            $table->decimal('physical_height_cm', 8, 2)->nullable()->after('physical_width_cm');
        });
    }

    public function down(): void
    {
        Schema::table('art_posts', function (Blueprint $table) {
            $table->dropColumn(['physical_width_cm', 'physical_height_cm']);
        });
    }
};
