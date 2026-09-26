<?php
// Copy outside the web root as technoland-config.php; see README.md.
return [
    'client_id' => 'SET_ME',
    'client_secret' => 'SET_ME',
    'redirect_uri' => 'https://www.kultmedia.com/lab/technolandapi/',
    'owner_endpoint' => 'https://www.kultmedia.com/lab/technoapi/',
    // A NEW database, separate from the existing owner backend's database.
    'database_path' => '/usr/www/users/kultcm/_db_stuff/technoland.sqlite',
    'frontend_urls' => [
        'https://antoniocosentino.github.io/technoland/',
        'http://localhost:3000/',
        'http://127.0.0.1:3000/',
    ],
];
