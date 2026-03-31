<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Agreed / confirmed meet-up coordinates
            $table->decimal('meetup_lat',   10, 7)->nullable()->after('meetup_location');
            $table->decimal('meetup_lng',   10, 7)->nullable()->after('meetup_lat');
            $table->string('meetup_label')->nullable()->after('meetup_lng');   // final place name
            $table->text('meetup_note')->nullable()->after('meetup_label');     // buyer's optional note

            // Negotiation state machine
            $table->enum('meetup_status', [
                'agreed',          // both parties happy (or buyer used default)
                'pending_artist',  // buyer proposed; waiting for artist
                'pending_buyer',   // artist countered; waiting for buyer
                'reverted',        // locked back to artist default
            ])->default('agreed')->after('meetup_note');

            $table->unsignedTinyInteger('meetup_round')->default(0)->after('meetup_status');

            // Working proposal (overwritten each round)
            $table->decimal('meetup_proposed_lat',   10, 7)->nullable()->after('meetup_round');
            $table->decimal('meetup_proposed_lng',   10, 7)->nullable()->after('meetup_proposed_lat');
            $table->string('meetup_proposed_label')->nullable()->after('meetup_proposed_lng');
            $table->enum('meetup_proposal_by', ['buyer', 'artist'])->nullable()->after('meetup_proposed_label');
            $table->timestamp('meetup_proposed_at')->nullable()->after('meetup_proposal_by');
            $table->timestamp('meetup_expires_at')->nullable()->after('meetup_proposed_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'meetup_lat', 'meetup_lng', 'meetup_label', 'meetup_note',
                'meetup_status', 'meetup_round',
                'meetup_proposed_lat', 'meetup_proposed_lng', 'meetup_proposed_label',
                'meetup_proposal_by', 'meetup_proposed_at', 'meetup_expires_at',
            ]);
        });
    }
};
