<!DOCTYPE html>
@php($siteName = data_get($page, 'props.siteSettings.site_name') ?: config('app.name', 'TaskFlow'))
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-site-name="{{ $siteName }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <style>
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        @php($faviconUrl = data_get($page, 'props.siteSettings.favicon_url'))
        @if ($faviconUrl)
            <link rel="icon" href="{{ $faviconUrl }}" type="image/png">
        @endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $siteName }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
