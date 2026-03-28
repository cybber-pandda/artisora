<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buyer_profiles', function (Blueprint $table) {
            $table->string('gcash_number', 20)->nullable()->after('phone_number');
        });
    }

    public function down(): void
    {
        Schema::table('buyer_profiles', function (Blueprint $table) {
            $table->dropColumn('gcash_number');
        });
    }
};
