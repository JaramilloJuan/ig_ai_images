# IG AI Images Extension

Diese TYPO3-Extension ermöglicht die Generierung von KI-Bildern direkt aus dem Backend mit OpenAI DALL-E 3.

## Features

- TCA-basierte Konfiguration für spezifische Bildfelder
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

## Konfiguration

### TCA-basierte Aktivierung

Die Extension aktiviert automatisch den "Generate AI Image" Button für Felder, die in ihrer TCA-Konfiguration das Flag `aiImageGeneration = true` haben.

**Beispiel für eigene Extensions:**

```php
// Configuration/TCA/Overrides/your_table.php
<?php
defined('TYPO3') || die();

// Aktiviere AI Image Generation für ein spezifisches Bildfeld
if (isset($GLOBALS['TCA']['your_table']['columns']['your_image_field'])) {
    $GLOBALS['TCA']['your_table']['columns']['your_image_field']['config']['aiImageGeneration'] = true;
}
```

**Vordefinierte Aktivierungen:**

Die Extension aktiviert standardmäßig AI Image Generation für:
- `tx_news_domain_model_news.fal_media` (News-Medien)
- `tx_igcontracts_domain_model_contract.images` (Contract-Bilder)
- `tx_igcontracts_domain_model_contract.logo` (Contract-Logos)

### Voraussetzungen für aktivierte Felder

- Feld muss vom Typ `'type' => 'file'` sein
- Feld muss das Flag `'aiImageGeneration' => true` in der TCA-Konfiguration haben

## Verwendung

1. Artikel bearbeiten (z.B. News-Artikel oder Contract)
2. Bei aktivierten Bildfeldern auf "Generate AI Image" Button klicken
3. Bildbeschreibung eingeben (z.B. "A beautiful sunset over mountains")
4. Bildgröße auswählen
5. "Generate" klicken
6. Nach der Generierung das Bild mit "Use Image" übernehmen

## Technische Details

### Komponenten

- **OpenAiService**: Handelt die Kommunikation mit der OpenAI API
- **AiImageController**: AJAX-Endpunkt für Backend-Requests
- **PageRendererHook**: Lädt JavaScript und scannt TCA für aktivierte Felder
- **AiImageWizard.js**: Frontend-JavaScript für Modal und AJAX
- **TCA/Overrides**: Aktivieren AI Image Generation für spezifische Felder

### Erweiterung für andere Extensions

Um AI Image Generation für Ihre eigene Extension zu aktivieren, erstellen Sie eine TCA-Override-Datei:

```php
// EXT:your_extension/Configuration/TCA/Overrides/your_table.php
<?php
defined('TYPO3') || die();

if (isset($GLOBALS['TCA']['your_table']['columns']['your_image_field'])) {
    $GLOBALS['TCA']['your_table']['columns']['your_image_field']['config']['aiImageGeneration'] = true;
}
```

### Sicherheit

- Der AI Image Button wird nur für explizit in der TCA konfigurierte Felder angezeigt
- Nur Felder vom Typ 'file' werden unterstützt
- Vollständige Kontrolle über die Verfügbarkeit durch TCA-Konfiguration

## Anforderungen

- TYPO3 13.x
- PHP 8.3+
- OpenAI API Key mit DALL-E 3 Zugriff

## Lizenz

GPL-2.0-or-later
