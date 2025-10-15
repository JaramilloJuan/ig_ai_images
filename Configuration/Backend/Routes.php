<?php

use Igelb\IgAiImages\Controller\AiImageController;

return [
    'ig_ai_images_generate' => [
        'path' => '/ig-ai-images/generate',
        'access' => 'public',
        'methods' => ['POST'],
        'target' => AiImageController::class . '::generateImageAction',
    ],
    'ig_ai_images_save' => [
        'path' => '/ig-ai-images/save',
        'access' => 'public',
        'methods' => ['POST'],
        'target' => AiImageController::class . '::saveImageAction',
    ],
    'ig_ai_images_storages' => [
        'path' => '/ig-ai-images/storages',
        'access' => 'public',
        'methods' => ['GET'],
        'target' => AiImageController::class . '::getStoragesAction',
    ],
    'ig_ai_images_folders' => [
        'path' => '/ig-ai-images/folders',
        'access' => 'public',
        'methods' => ['GET'],
        'target' => AiImageController::class . '::getFoldersAction',
    ],
];