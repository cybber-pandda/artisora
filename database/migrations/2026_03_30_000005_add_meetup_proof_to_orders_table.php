<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('meetup_proof_path')->nullable()->after('meetup_expires_at');
            $table->timestamp('meetup_proof_at')->nullable()->after('meetup_proof_path');
            $table->unsignedTinyInteger('meetup_experience_rating')->nullable()->after('meetup_proof_at');
            $table->text('meetup_experience_comment')->nullable()->after('meetup_experience_rating');
            $table->timestamp('meetup_completed_at')->nullable()->after('meetup_experience_comment');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'meetup_proof_path',
                'meetup_proof_at',
                'meetup_experience_rating',
                'meetup_experience_comment',
                'meetup_completed_at',
            ]);
        });
    }
};
