<?php

declare(strict_types=1);

namespace Igelb\IgAiImages\Hooks;

use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Http\ApplicationType;
use TYPO3\CMS\Core\Utility\PathUtility;

class PageRendererHook
{
    public function addJavaScriptModules(array $params, PageRenderer $pageRenderer): void
    {
        // Check if we are in the backend
        if (($GLOBALS['TYPO3_REQUEST'] ?? null) instanceof \Psr\Http\Message\ServerRequestInterface) {
            $applicationType = ApplicationType::fromRequest($GLOBALS['TYPO3_REQUEST']);
            if ($applicationType->isBackend()) {
                // Load JavaScript file directly - TYPO3 will resolve EXT: path
                $pageRenderer->addJsFile(
                    'EXT:ig_ai_images/Resources/Public/JavaScript/AiImageWizard.js',
                    'module'
                );
                $pageRenderer->addCssFile('EXT:ig_ai_images/Resources/Public/Css/AiImageWizard.css');
                
                // Register AJAX URL in TYPO3.settings for use in JavaScript
                $pageRenderer->addInlineSettingArray('ajaxUrls', [
                    'ig_ai_images_generate' => GeneralUtility::makeInstance(\TYPO3\CMS\Backend\Routing\UriBuilder::class)
                        ->buildUriFromRoute('ig_ai_images_generate')
                ]);
            }
        }
    }
}