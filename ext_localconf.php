<?php

defined('TYPO3') || die();

(static function () {    
    // Register PageRenderer Hook für JavaScript/AJAX-URL Registrierung
    $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_pagerenderer.php']['render-preProcess'][] = 
        \Igelb\IgAiImages\Hooks\PageRendererHook::class . '->addJavaScriptModules';
})();