# IG AI Images Extension

Diese TYPO3-Extension ermöglicht die Generierung von KI-Bildern direkt aus dem Backend mit OpenAI DALL-E 3.

## Features

- Field Wizard für Bildfelder (z.B. `tx_news_domain_model_news.fal_media`)
- Integration mit OpenAI DALL-E 3
- Automatisches Speichern generierter Bilder in FAL
- Modal-Dialog zur Bildbeschreibung
- Auswahl verschiedener Bildgrößen (1024x1024, 1024x1792, 1792x1024)

## Installation

1. Extension mit Composer installieren:
```bash
composer require igelb/ig-ai-images
```

2. OpenAI API Key in `.env` Datei hinzufügen:
```
OPENAI_API_KEY='your-api-key-here'
```

3. TYPO3 Backend Cache leeren

## Verwendung

1. News-Artikel bearbeiten (oder andere Entitäten mit Bildfeldern)
2. Beim Bildfeld auf "Generate AI Image" Button klicken
3. Bildbeschreibung eingeben (z.B. "A beautiful sunset over mountains")
4. Bildgröße auswählen
5. "Generate" klicken
6. Nach der Generierung das Bild mit "Use Image" übernehmen

## Technische Details

### Komponenten

- **OpenAiService**: Handelt die Kommunikation mit der OpenAI API
- **AiImageController**: AJAX-Endpunkt für Backend-Requests
- **AiImageWizard**: Field Wizard für TCA-Felder
- **AiImageWizard.js**: Frontend-JavaScript für Modal und AJAX

### Erweiterung für andere Felder

Um den AI Image Wizard für andere Felder zu aktivieren, erstelle eine TCA Override-Datei:

```php
$GLOBALS['TCA']['your_table']['columns']['your_image_field']['config']['fieldWizard']['aiImageWizard'] = [
    'renderType' => 'aiImageWizard',
    'after' => ['localizationStateSelector'],
];
```

## Anforderungen

- TYPO3 13.x
- PHP 8.3+
- OpenAI API Key mit DALL-E 3 Zugriff

## Lizenz

GPL-2.0-or-later
