<?php

return [
    'dependencies' => [
        'core',
        'backend',
    ],
    'imports' => [
        '@igelb/ig-ai-images/ai-image-wizard.js' => 'EXT:ig_ai_images/Resources/Public/JavaScript/AiImageWizard.js',
    ],
    'cssFiles' => [
        'EXT:ig_ai_images/Resources/Public/Css/AiImageWizard.css',
    ],
];