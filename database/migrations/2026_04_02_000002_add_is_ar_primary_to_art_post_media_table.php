<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('art_post_media', function (Blueprint $table) {
            // Marks which gallery image should be used as the AR texture
            $table->boolean('is_ar_primary')->default(false)->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('art_post_media', function (Blueprint $table) {
            $table->dropColumn('is_ar_primary');
        });
    }
};
