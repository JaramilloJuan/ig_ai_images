<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'IG AI Images',
    'description' => 'AI Image processing extension for TYPO3',
    'category' => 'plugin',
    'author' => 'Igelb',
    'author_email' => '',
    'state' => 'alpha',
    'version' => '1.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.0.0-13.9.99',
            'php' => '8.3.0-8.4.99'
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];