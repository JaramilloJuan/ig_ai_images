<?php

use Igelb\IgAiImages\Controller\AiImageController;

return [
    'ig_ai_images_generate' => [
        'path' => '/ig-ai-images/generate',
        'access' => 'public',
        'methods' => ['POST'],
        'target' => AiImageController::class . '::generateImageAction',
    ],
];