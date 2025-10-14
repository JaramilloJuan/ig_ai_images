<?php

declare(strict_types=1);

namespace Igelb\IgAiImages\Controller;

use Igelb\IgAiImages\Service\OpenAiService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Context\Context;

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
                
                // Save image to FAL
                $filename = 'ai_generated_' . time() . '.png';
                $fileUid = $openAiService->saveImageToFal($result['url'], $filename);

                return new JsonResponse([
                    'success' => true,
                    'fileUid' => $fileUid,
                    'url' => $base64Image, // Return base64 data URL instead of external URL
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
}