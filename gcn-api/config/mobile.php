<?php

// Mobile app distribution. `apk_url` is the GLOBAL default download link (a
// Google Drive / VPS URL) used for any dealer that doesn't have their own
// `dealers.apk_url` set. Set APK_URL in .env once you have the APK online.
return [
    'apk_url' => env('APK_URL'),
];
