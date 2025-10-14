<?php

declare(strict_types=1);

namespace Igelb\IgAiImages\Hooks;

use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Http\ApplicationType;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class PageRendererHook
{
    /**
     * @param array<string, mixed> $params
     */
    public function addJavaScriptModules(array $params, PageRenderer $pageRenderer): void
    {
        $request = $GLOBALS['TYPO3_REQUEST'] ?? null;
        if (!$request || !ApplicationType::fromRequest($request)->isBackend()) {
            return;
        }

        // Add JavaScript module using the registered alias from JavaScriptModules.php
        // CSS wird automatisch über JavaScriptModules.php geladen
        $pageRenderer->getJavaScriptRenderer()->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@igelb/ig-ai-images/ai-image-wizard.js')
        );
        
        // Register AJAX URL
        $uriBuilder = GeneralUtility::makeInstance(UriBuilder::class);
        $pageRenderer->addInlineSettingArray('ajaxUrls', [
            'ig_ai_images_generate' => (string)$uriBuilder->buildUriFromRoute('ig_ai_images_generate')
        ]);
    }
}