<?php

defined('TYPO3') || die();

(static function () {
    // Register backend module assets
    $GLOBALS['TYPO3_CONF_VARS']['BE']['stylesheets']['ig_ai_images'] = 'EXT:ig_ai_images/Resources/Public/Css/';
    
    // Add JavaScript module via PageRenderer hook
    $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_pagerenderer.php']['render-preProcess'][] = 
        \Igelb\IgAiImages\Hooks\PageRendererHook::class . '->addJavaScriptModules';
})();