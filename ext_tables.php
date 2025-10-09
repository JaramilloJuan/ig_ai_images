<?php

defined('TYPO3') || die();

(static function () {
    // Register JavaScript module for backend
    if (TYPO3\CMS\Core\Utility\GeneralUtility::makeInstance(TYPO3\CMS\Core\Information\Typo3Version::class)->getMajorVersion() >= 13) {
        $GLOBALS['TYPO3_CONF_VARS']['BE']['stylesheets']['ig_ai_images'] = 'EXT:ig_ai_images/Resources/Public/Css/AiImageWizard.css';
    }
})();