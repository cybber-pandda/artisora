<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ClearCloudStorage extends Command
{
    protected $signature = 'storage:clear-cloud {--force : Skip confirmation}';
    protected $description = 'Delete ALL files from the S3/R2 cloud storage bucket';

    public function handle(): int
    {
        $disk  = Storage::disk('s3');
        $files = $disk->allFiles();

        if (empty($files)) {
            $this->info('☁️  Cloud storage is already empty. Nothing to delete.');
            return self::SUCCESS;
        }

        $count = count($files);
        $this->warn("Found {$count} file(s) in cloud storage:");

        // Show first 20 files as preview
        foreach (array_slice($files, 0, 20) as $file) {
            $this->line("   • {$file}");
        }
        if (count($files) > 20) {
            $this->line("   … and " . (count($files) - 20) . " more.");
        }

        if (! $this->option('force') && ! $this->confirm('⚠️  Delete ALL these files from cloud storage? This cannot be undone.')) {
            $this->info('Cancelled.');
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar(count($files));
        $bar->start();

        $deleted = 0;
        foreach ($files as $file) {
            $disk->delete($file);
            $deleted++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("✅ Deleted {$deleted} file(s) from cloud storage.");

        return self::SUCCESS;
    }
}
