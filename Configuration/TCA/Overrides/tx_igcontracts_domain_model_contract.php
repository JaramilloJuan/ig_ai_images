<?php
defined('TYPO3') || die();

// Add AI Image Generation to images field
if (isset($GLOBALS['TCA']['tx_igcontracts_domain_model_contract']['columns']['images'])) {
    $GLOBALS['TCA']['tx_igcontracts_domain_model_contract']['columns']['images']['config']['aiImageGeneration'] = true;
}

// Add AI Image Generation to logo field if it exists
if (isset($GLOBALS['TCA']['tx_igcontracts_domain_model_contract']['columns']['logo'])) {
    $GLOBALS['TCA']['tx_igcontracts_domain_model_contract']['columns']['logo']['config']['aiImageGeneration'] = true;
}