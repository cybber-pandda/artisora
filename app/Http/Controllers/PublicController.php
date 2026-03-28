<?php

namespace App\Http\Controllers;

use App\Models\ArtistProfile;
use Inertia\Inertia;
use Inertia\Response;

class PublicController extends Controller
{
    public function welcome(): Response
    {
        // Later — replace with real DB queries:
        // $featuredArtworks = Artwork::with('artist')->featured()->latest()->take(12)->get();
        // $categories = Category::withCount('artworks')->get();

        // For now, pass placeholder data so the frontend renders properly
        $categories = [
            'Oil Painting', 'Watercolor', 'Acrylic',
            'Digital Art', 'Charcoal', 'Mixed Media',
        ];

        return Inertia::render('Welcome', [
            'canLogin'    => true,
            'canRegister' => true,
            'categories'  => $categories,
            // 'featuredArtworks' => $featuredArtworks, // when DB is ready
        ]);
    }
}