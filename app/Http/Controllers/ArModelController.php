<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ArModelController extends Controller
{
    /**
     * Serve a dynamically generated GLB with the painting texture baked in
     * and the physical dimensions set directly in the mesh vertices.
     *
     * This is intentionally PUBLIC (no auth) because Google Scene Viewer on
     * Android fetches the GLB URL directly — outside the browser session.
     */
    public function glb(ArtPost $artPost): SymfonyResponse
    {
        abort_unless(
            $artPost->is_for_sale &&
            $artPost->status === 'published' &&
            $artPost->physical_width_cm &&
            $artPost->physical_height_cm,
            404
        );

        // Resolve which image to use as the AR texture
        $media      = $artPost->media()->get();
        $arMedia    = $media->where('is_ar_primary', true)->where('type', 'image')->first()
                   ?? $media->where('type', 'image')->first();
        $imagePath  = $arMedia?->path ?? $artPost->cover_image;

        abort_if(!$imagePath, 404);

        try {
            $imageData = Storage::disk('s3')->get($imagePath);
            abort_if(!$imageData, 404);
        } catch (\Exception) {
            abort(500, 'Could not retrieve artwork image.');
        }

        // Detect mime type from raw bytes
        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($imageData);
        if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
            $mimeType = 'image/jpeg';
        }

        $widthM  = (float) $artPost->physical_width_cm  / 100;
        $heightM = (float) $artPost->physical_height_cm / 100;

        $glb = $this->buildGLB($imageData, $mimeType, $widthM, $heightM);

        // Cache for 1 hour — dimensions/image rarely change
        return response($glb, 200, [
            'Content-Type'           => 'model/gltf-binary',
            'Content-Length'         => strlen($glb),
            'Content-Disposition'    => 'inline; filename="painting.glb"',
            'Cache-Control'          => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
            // Allow model-viewer and Scene Viewer to fetch cross-origin
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    // ── GLB builder ──────────────────────────────────────────────────

    private function buildGLB(string $imageData, string $mimeType, float $wM, float $hM): string
    {
        $hw = $wM / 2;
        $hh = $hM / 2;

        // Binary layout:
        //   offset  0 – 47  : positions  (4 verts × 3 floats × 4 B = 48 B)
        //   offset 48 – 79  : UVs        (4 verts × 2 floats × 4 B = 32 B)
        //   offset 80 – 91  : indices    (6 × uint16 × 2 B = 12 B)   [92 total, 4-B aligned]
        //   offset 92 …     : image data

        // Painting faces +Z; UV origin at top-left (glTF convention)
        $verts  = pack('g*', -$hw, -$hh, 0.0,  $hw, -$hh, 0.0,  $hw, $hh, 0.0,  -$hw, $hh, 0.0);
        $uvs    = pack('g*', 0.0,  1.0,          1.0,  1.0,          1.0,  0.0,          0.0,  0.0);
        $idxs   = pack('v*', 0, 1, 2,  0, 2, 3);

        $geom       = $verts . $uvs . $idxs;   // 92 bytes, already 4-B aligned
        $imgOffset  = strlen($geom);            // == 92
        $imgLen     = strlen($imageData);

        $bin     = $geom . $imageData;
        $binPad  = (4 - (strlen($bin) % 4)) % 4;
        $bin    .= str_repeat("\x00", $binPad);

        $gltf = [
            'asset'   => ['generator' => 'Artisora AR', 'version' => '2.0'],
            'scene'   => 0,
            'scenes'  => [['nodes' => [0]]],
            'nodes'   => [['mesh' => 0, 'name' => 'painting']],
            'meshes'  => [[
                'name'       => 'painting',
                'primitives' => [[
                    'attributes' => ['POSITION' => 0, 'TEXCOORD_0' => 1],
                    'indices'    => 2,
                    'material'   => 0,
                    'mode'       => 4,
                ]],
            ]],
            'materials' => [[
                'name'                   => 'painting',
                'pbrMetallicRoughness'   => [
                    'baseColorTexture'   => ['index' => 0],
                    'metallicFactor'     => 0.0,
                    'roughnessFactor'    => 0.9,
                ],
                'doubleSided' => true,
            ]],
            'textures' => [['sampler' => 0, 'source' => 0]],
            'samplers' => [[
                'magFilter' => 9729,  // LINEAR
                'minFilter' => 9987,  // LINEAR_MIPMAP_LINEAR
                'wrapS'     => 33071, // CLAMP_TO_EDGE
                'wrapT'     => 33071,
            ]],
            'images' => [['bufferView' => 3, 'mimeType' => $mimeType]],
            'accessors' => [
                // Positions
                ['bufferView' => 0, 'componentType' => 5126, 'count' => 4, 'type' => 'VEC3',
                 'max' => [$hw, $hh, 0.0], 'min' => [-$hw, -$hh, 0.0]],
                // UVs
                ['bufferView' => 1, 'componentType' => 5126, 'count' => 4, 'type' => 'VEC2'],
                // Indices
                ['bufferView' => 2, 'componentType' => 5123, 'count' => 6, 'type' => 'SCALAR'],
            ],
            'bufferViews' => [
                ['buffer' => 0, 'byteOffset' => 0,          'byteLength' => 48],
                ['buffer' => 0, 'byteOffset' => 48,         'byteLength' => 32],
                ['buffer' => 0, 'byteOffset' => 80,         'byteLength' => 12],
                ['buffer' => 0, 'byteOffset' => $imgOffset, 'byteLength' => $imgLen],
            ],
            'buffers' => [['byteLength' => strlen($bin)]],
        ];

        return $this->packGLB(
            json_encode($gltf, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $bin
        );
    }

    private function packGLB(string $json, string $bin): string
    {
        // Pad JSON to 4-byte boundary with spaces (0x20)
        $jpd = (4 - (strlen($json) % 4)) % 4;
        $json .= str_repeat(' ', $jpd);

        // Pad BIN to 4-byte boundary with nulls
        $bpd = (4 - (strlen($bin) % 4)) % 4;
        $bin .= str_repeat("\x00", $bpd);

        $total = 12 + 8 + strlen($json) + 8 + strlen($bin);

        return pack('VVV', 0x46546C67, 2, $total)           // GLB header
             . pack('VV',  strlen($json), 0x4E4F534A) . $json  // JSON chunk
             . pack('VV',  strlen($bin),  0x004E4942) . $bin;  // BIN  chunk
    }
}
