<?php

declare(strict_types=1);

namespace Igelb\IgAiImages\Controller;

use Igelb\IgAiImages\Service\OpenAiService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Resource\StorageRepository;

class AiImageController
{
    public function generateImageAction(ServerRequestInterface $request): ResponseInterface
    {
        // Check if backend user is logged in
        $context = GeneralUtility::makeInstance(Context::class);
        if (!$context->getPropertyFromAspect('backend.user', 'isLoggedIn')) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Not authenticated',
            ], 401);
        }

        $parsedBody = $request->getParsedBody();
        
        // Ensure $parsedBody is an array
        if (!is_array($parsedBody)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Invalid request body',
            ], 400);
        }
        
        $prompt = $parsedBody['prompt'] ?? '';
        $size = $parsedBody['size'] ?? '1024x1024';

        if (empty($prompt)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Prompt is required',
            ], 400);
        }

        try {
            $openAiService = GeneralUtility::makeInstance(OpenAiService::class);
            $result = $openAiService->generateImage($prompt, $size);

            if ($result['success']) {
                // Ensure required keys exist in success response
                if (!isset($result['url']) || !isset($result['prompt'])) {
                    return new JsonResponse([
                        'success' => false,
                        'error' => 'Invalid response from image generation service',
                    ], 500);
                }
                
                // Download image and convert to base64 data URL for display in modal
                // This bypasses CSP restrictions
                $imageContent = GeneralUtility::getUrl($result['url']);
                
                if ($imageContent === false) {
                    return new JsonResponse([
                        'success' => false,
                        'error' => 'Failed to download generated image',
                    ], 500);
                }
                
                $base64Image = 'data:image/png;base64,' . base64_encode($imageContent);
                
                // Don't save yet - just return the image for preview
                return new JsonResponse([
                    'success' => true,
                    'url' => $base64Image,
                    'originalUrl' => $result['url'], // Keep original URL for later saving
                    'prompt' => $result['prompt'],
                ]);
            }

            return new JsonResponse($result, 500);
        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function saveImageAction(ServerRequestInterface $request): ResponseInterface
    {
        // Check if backend user is logged in
        $context = GeneralUtility::makeInstance(Context::class);
        if (!$context->getPropertyFromAspect('backend.user', 'isLoggedIn')) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Not authenticated',
            ], 401);
        }
        
        $parsedBody = $request->getParsedBody();
        
        if (!is_array($parsedBody)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Invalid request body',
            ], 400);
        }
        
        $imageUrl = $parsedBody['imageUrl'] ?? '';
        $filename = $parsedBody['filename'] ?? '';
        $storageUid = (int)($parsedBody['storage'] ?? 0);
        $folderPath = $parsedBody['folder'] ?? 'user_upload/';
        
        if (empty($imageUrl) || empty($filename)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Image URL and filename are required',
            ], 400);
        }
        
        try {
            $openAiService = GeneralUtility::makeInstance(OpenAiService::class);
            $fileUid = $openAiService->saveImageToFal($imageUrl, $filename, $storageUid, $folderPath);
            
            return new JsonResponse([
                'success' => true,
                'fileUid' => $fileUid,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function getStoragesAction(ServerRequestInterface $request): ResponseInterface
    {
        // Check if backend user is logged in
        $context = GeneralUtility::makeInstance(Context::class);
        if (!$context->getPropertyFromAspect('backend.user', 'isLoggedIn')) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Not authenticated',
            ], 401);
        }
        
        try {
            $storageRepository = GeneralUtility::makeInstance(StorageRepository::class);
            $storages = $storageRepository->findAll();
            
            $storageList = [];
            foreach ($storages as $storage) {
                if ($storage->isOnline()) {
                    $storageList[] = [
                        'uid' => $storage->getUid(),
                        'name' => $storage->getName(),
                        'isDefault' => $storage->isDefault(),
                    ];
                }
            }
            
            return new JsonResponse([
                'success' => true,
                'storages' => $storageList,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function getFoldersAction(ServerRequestInterface $request): ResponseInterface
    {
        // Check if backend user is logged in
        $context = GeneralUtility::makeInstance(Context::class);
        if (!$context->getPropertyFromAspect('backend.user', 'isLoggedIn')) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Not authenticated',
            ], 401);
        }
        
        $queryParams = $request->getQueryParams();
        $storageUid = (int)($queryParams['storage'] ?? 0);
        
        if ($storageUid === 0) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Storage UID is required',
            ], 400);
        }
        
        try {
            $storageRepository = GeneralUtility::makeInstance(StorageRepository::class);
            $storage = $storageRepository->findByUid($storageUid);
            
            if (!$storage) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Storage not found',
                ], 404);
            }
            
            $rootFolder = $storage->getRootLevelFolder();
            $folders = $this->getFolderTree($rootFolder);
            
            return new JsonResponse([
                'success' => true,
                'folders' => $folders,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    private function getFolderTree($folder, $path = '')
    {
        $folders = [];
        
        foreach ($folder->getSubfolders() as $subFolder) {
            $folderPath = $path . $subFolder->getName() . '/';
            $folders[] = [
                'name' => $subFolder->getName(),
                'path' => $folderPath,
                'fullPath' => $path . $subFolder->getName(),
            ];
            
            // Recursively get subfolders (limit depth to avoid performance issues)
            if (substr_count($folderPath, '/') < 3) {
                $subFolders = $this->getFolderTree($subFolder, $folderPath);
                $folders = array_merge($folders, $subFolders);
            }
        }
        
        return $folders;
    }
}