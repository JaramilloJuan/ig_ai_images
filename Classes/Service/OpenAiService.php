<?php

declare(strict_types=1);

namespace Igelb\IgAiImages\Service;

use OpenAI\Client;
use TYPO3\CMS\Core\Resource\ResourceFactory;
use TYPO3\CMS\Core\Resource\StorageRepository;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Log\LogManager;
use TYPO3\CMS\Core\Core\Environment;

class OpenAiService
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = $_ENV['OPENAI_API_KEY'] ?? '';
    }

    /**
     * @return array{success: bool, error?: string, url?: string, prompt?: string}
     */
    public function generateImage(string $prompt, string $size = '1024x1024'): array
    {
        if (empty($this->apiKey)) {
            return [
                'success' => false,
                'error' => 'OpenAI API Key not configured in .env file',
            ];
        }

        $client = \OpenAI::client($this->apiKey);

        try {
            $response = $client->images()->create([
                'model' => 'dall-e-3',
                'prompt' => $prompt,
                'size' => $size,
                'quality' => 'standard',
                'n' => 1,
            ]);

            $imageUrl = $response->data[0]->url;
            
            return [
                'success' => true,
                'url' => $imageUrl,
                'prompt' => $prompt,
            ];
        } catch (\OpenAI\Exceptions\ErrorException $e) {
            // Log the detailed error
            $logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(__CLASS__);
            $logger->error('OpenAI API Error', [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ]);
            
            return [
                'success' => false,
                'error' => 'OpenAI API Error: ' . $e->getMessage(),
            ];
        } catch (\Exception $e) {
            // Log any other error
            $logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(__CLASS__);
            $logger->error('Unexpected error during image generation', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return [
                'success' => false,
                'error' => 'Error: ' . $e->getMessage(),
            ];
        }
    }

    public function saveImageToFal(string $imageUrl, string $filename, int $storageUid = 0, string $folderPath = 'user_upload/'): ?int
    {
        try {
            // Download image content
            $imageContent = GeneralUtility::getUrl($imageUrl);
            
            if ($imageContent === false) {
                throw new \RuntimeException('Failed to download image from URL');
            }

            // Save to temporary file first
            $tempPath = Environment::getVarPath() . '/transient/';
            if (!is_dir($tempPath)) {
                GeneralUtility::mkdir_deep($tempPath);
            }
            
            $tempFile = $tempPath . $filename;
            file_put_contents($tempFile, $imageContent);

            // Get the storage
            $storageRepository = GeneralUtility::makeInstance(StorageRepository::class);
            
            if ($storageUid > 0) {
                $storage = $storageRepository->findByUid($storageUid);
                if (!$storage) {
                    throw new \RuntimeException('Storage with UID ' . $storageUid . ' not found');
                }
            } else {
                $storage = $storageRepository->getDefaultStorage();
                if ($storage === null) {
                    throw new \RuntimeException('No default storage found');
                }
            }
            
            // Get or create the target folder
            try {
                $targetFolder = $storage->getFolder($folderPath);
            } catch (\Exception $e) {
                // If folder doesn't exist, try to create it
                $folderParts = array_filter(explode('/', trim($folderPath, '/')));
                $currentFolder = $storage->getRootLevelFolder();
                
                foreach ($folderParts as $folderName) {
                    try {
                        $currentFolder = $currentFolder->getSubfolder($folderName);
                    } catch (\Exception $e) {
                        // Folder doesn't exist, create it
                        $currentFolder = $currentFolder->createFolder($folderName);
                    }
                }
                
                $targetFolder = $currentFolder;
            }
            
            $file = $storage->addFile(
                $tempFile,
                $targetFolder,
                $filename,
                \TYPO3\CMS\Core\Resource\DuplicationBehavior::REPLACE
            );

            // Clean up temporary file
            @unlink($tempFile);

            return $file->getUid();
        } catch (\Exception $e) {
            // Clean up temporary file on error
            if (isset($tempFile) && file_exists($tempFile)) {
                @unlink($tempFile);
            }
            
            throw new \RuntimeException('Failed to save image to FAL: ' . $e->getMessage());
        }
    }
}