<?php
defined('TYPO3') || die();

// Add AI Image Generation to fal_media field
if (isset($GLOBALS['TCA']['tx_news_domain_model_news']['columns']['fal_media'])) {
    $GLOBALS['TCA']['tx_news_domain_model_news']['columns']['fal_media']['config']['aiImageGeneration'] = true;
}