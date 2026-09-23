<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSiteSettingsRequest;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SiteSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $siteSetting = SiteSetting::current();
        Gate::authorize('view', $siteSetting);

        return Inertia::render('admin/site-settings', [
            'settings' => $siteSetting->toPublicArray(),
        ]);
    }

    public function update(UpdateSiteSettingsRequest $request): RedirectResponse
    {
        $siteSetting = SiteSetting::current();
        Gate::authorize('update', $siteSetting);

        $validated = $request->validated();
        $oldLogoPath = $siteSetting->logo_path;
        $oldFaviconPath = $siteSetting->favicon_path;

        $siteSetting->fill([
            'site_name' => $validated['site_name'],
            'keyword' => $validated['keyword'],
            'tagline' => $validated['tagline'] ?? null,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->hasFile('logo')) {
            $siteSetting->logo_path = $request->file('logo')->store('site', 'public');
        }

        if ($request->hasFile('favicon')) {
            $siteSetting->favicon_path = $request->file('favicon')->store('site', 'public');
        }

        $siteSetting->save();

        if ($oldLogoPath !== $siteSetting->logo_path && $oldLogoPath !== null) {
            Storage::disk('public')->delete($oldLogoPath);
        }

        if ($oldFaviconPath !== $siteSetting->favicon_path && $oldFaviconPath !== null) {
            Storage::disk('public')->delete($oldFaviconPath);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengaturan website berhasil disimpan.',
        ]);

        return back();
    }
}
