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
        
        // Get enabled fields from TCA configuration
        $enabledFields = $this->getEnabledFieldsFromTCA();
        
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
        
        // Add configuration for enabled fields
        $pageRenderer->addInlineSettingArray('igAiImages', [
            'enabledFields' => $enabledFields
        ]);
    }
    
    /**
     * Get enabled fields from TCA configuration
     * 
     * @return array<int, array{table: string, field: string}>
     */
    private function getEnabledFieldsFromTCA(): array
    {
        $enabledFields = [];
        
        // Iterate through all TCA tables
        foreach ($GLOBALS['TCA'] ?? [] as $table => $tableConfig) {
            if (!isset($tableConfig['columns'])) {
                continue;
            }
            
            // Check each column for aiImageGeneration flag
            foreach ($tableConfig['columns'] as $fieldName => $fieldConfig) {
                if (isset($fieldConfig['config']['aiImageGeneration']) && 
                    $fieldConfig['config']['aiImageGeneration'] === true &&
                    $fieldConfig['config']['type'] === 'file') {
                    
                    $enabledFields[] = [
                        'table' => $table,
                        'field' => $fieldName
                    ];
                }
            }
        }
        
        return $enabledFields;
    }
}