/**
 * Module: TYPO3/CMS/IgAiImages/AiImageWizard
 */
import Modal from '@typo3/backend/modal.js';
import Notification from '@typo3/backend/notification.js';
import AjaxRequest from '@typo3/core/ajax/ajax-request.js';
import {MessageUtility} from '@typo3/backend/utility/message-utility.js';
import Icons from '@typo3/backend/icons.js';

class AiImageWizard {
    constructor() {
        this.currentModal = null;
        this.enabledFields = [];
        this.debug = true; // Enable debugging
        this.iconOn = "actions-infinity";
        this.iconOff = "spinner-circle";
        this.generatedImageData = null; // Store generated image data
        this.init();
    }

    init() {
        // Get configuration from TYPO3 settings
        if (TYPO3.settings && TYPO3.settings.igAiImages && TYPO3.settings.igAiImages.enabledFields) {
            this.enabledFields = TYPO3.settings.igAiImages.enabledFields;
        }

        if (this.debug) {
            console.log('AiImageWizard: Enabled fields:', this.enabledFields);
        }

        // If no fields are configured, don't add any buttons
        if (this.enabledFields.length === 0) {
            if (this.debug) {
                console.log('AiImageWizard: No enabled fields configured');
            }
            return;
        }

        // Wait for DOM to be ready and add buttons to configured FAL fields
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.addButtonsToFalFields());
        } else {
            this.addButtonsToFalFields();
        }

        // Re-add buttons when IRRE (inline) elements are added/updated
        document.addEventListener('t3-formengine-inline-created', () => {
            if (this.debug) {
                console.log('AiImageWizard: IRRE element created, re-adding buttons');
            }
            setTimeout(() => this.addButtonsToFalFields(), 100);
        });

        // Re-add buttons when inline records are deleted or modified
        document.addEventListener('click', (e) => {
            // Handle delete buttons
            if (e.target.matches('.t3js-editform-delete-file-reference, .t3js-editform-delete-file-reference *')) {
                if (this.debug) {
                    console.log('AiImageWizard: File reference delete detected');
                }
                setTimeout(() => {
                    this.addButtonsToFalFields();
                }, 100);
            }
        });

        // Listen for DOM changes in file containers to detect when files are removed
        this.observeFileContainers();

        // Also listen for TYPO3 form engine events
        document.addEventListener('typo3:formengine:field-change', () => {
            if (this.debug) {
                console.log('AiImageWizard: Form engine field change detected');
            }
            setTimeout(() => this.addButtonsToFalFields(), 100);
        });
    }

    /**
     * Observe file containers for changes (files being added/removed)
     */
    observeFileContainers() {
        const observer = new MutationObserver((mutations) => {
            let shouldRefresh = false;
            
            mutations.forEach((mutation) => {
                // Check if nodes were added or removed in file containers
                if (mutation.type === 'childList') {
                    const target = mutation.target;
                    
                    // Check if the change happened in a file container
                    if (target.matches('typo3-formengine-container-files, .panel-group') || 
                        target.closest('typo3-formengine-container-files, .panel-group')) {
                        
                        if (this.debug) {
                            console.log('AiImageWizard: File container change detected via MutationObserver');
                        }
                        shouldRefresh = true;
                    }
                }
                
                // Check for attribute changes that might indicate visibility changes
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'hidden')) {
                    
                    const target = mutation.target;
                    if (target.matches('.t3js-element-browser, .t3js-drag-uploader') ||
                        target.closest('.t3js-file-controls')) {
                        
                        if (this.debug) {
                            console.log('AiImageWizard: Button visibility change detected');
                        }
                        shouldRefresh = true;
                    }
                }
            });
            
            if (shouldRefresh) {
                // Debounce the refresh to avoid multiple rapid updates
                clearTimeout(this.refreshTimeout);
                this.refreshTimeout = setTimeout(() => {
                    this.addButtonsToFalFields();
                }, 150);
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'hidden', 'class']
        });

        // Store observer reference for potential cleanup
        this.mutationObserver = observer;
    }

    /**
     * Check if AI button should be shown for this field
     */
    isFieldEnabled(table, fieldName) {
        const isEnabled = this.enabledFields.some(config => 
            config.table === table && config.field === fieldName
        );
        if (this.debug) {
            console.log(`AiImageWizard: Checking field ${table}.${fieldName}: ${isEnabled ? 'enabled' : 'disabled'}`);
        }
        return isEnabled;
    }

    /**
     * Extract table and field name from various sources
     */
    getTableAndFieldInfo(controlWrapper) {
        let tableAndField = null;

        // Method 1: Check for typo3-formengine-container-files element (TYPO3 13+)
        const containerFiles = controlWrapper.closest('typo3-formengine-container-files');
        if (containerFiles) {
            const localTable = containerFiles.getAttribute('data-local-table');
            const localField = containerFiles.getAttribute('data-local-field');
            
            if (localTable && localField) {
                tableAndField = {
                    table: localTable,
                    field: localField
                };
                if (this.debug) {
                    console.log('AiImageWizard: Found table/field from typo3-formengine-container-files:', tableAndField);
                }
                return tableAndField;
            }
        }

        // Method 2: Try to get from form group data attributes
        const formGroup = controlWrapper.closest('.form-group[data-local-table][data-local-field]');
        if (formGroup) {
            const localTable = formGroup.getAttribute('data-local-table');
            const localField = formGroup.getAttribute('data-local-field');
            
            if (localTable && localField) {
                tableAndField = {
                    table: localTable,
                    field: localField
                };
                if (this.debug) {
                    console.log('AiImageWizard: Found table/field from form group:', tableAndField);
                }
                return tableAndField;
            }
        }

        // Method 3: Try to get from form field names in the container
        const formContainer = controlWrapper.closest('.t3js-formengine-field-item, .t3js-formengine-inline-item');
        if (formContainer) {
            const hiddenInputs = formContainer.querySelectorAll('input[type="hidden"]');
            for (const input of hiddenInputs) {
                if (input.name && input.name.includes('data[')) {
                    const match = input.name.match(/data\[([^\]]+)\]\[\d+\]\[([^\]]+)\]/);
                    if (match) {
                        tableAndField = {
                            table: match[1],
                            field: match[2]
                        };
                        if (this.debug) {
                            console.log('AiImageWizard: Found table/field from hidden input:', tableAndField);
                        }
                        break;
                    }
                }
            }
        }

        // Method 4: Try to get from data attributes
        if (!tableAndField) {
            const inlineItem = controlWrapper.closest('[data-object-group]');
            if (inlineItem && inlineItem.dataset.objectGroup) {
                const objectGroup = inlineItem.dataset.objectGroup;
                // Object group format: data[tx_news_domain_model_news][123][fal_media]
                const match = objectGroup.match(/data\[([^\]]+)\]\[\d+\]\[([^\]]+)\]/);
                if (match) {
                    tableAndField = {
                        table: match[1],
                        field: match[2]
                    };
                    if (this.debug) {
                        console.log('AiImageWizard: Found table/field from object group:', tableAndField);
                    }
                }
            }
        }

        // Method 5: Try to get from form element data
        if (!tableAndField) {
            const formElement = controlWrapper.closest('[data-fieldname]');
            if (formElement && formElement.dataset.fieldname) {
                const fieldName = formElement.dataset.fieldname;
                const editForm = controlWrapper.closest('form[name="editform"]');
                if (editForm) {
                    // Look for table information in the form
                    const tableInputs = editForm.querySelectorAll('input[name*="[table]"]');
                    for (const tableInput of tableInputs) {
                        if (tableInput.value) {
                            tableAndField = {
                                table: tableInput.value,
                                field: fieldName
                            };
                            if (this.debug) {
                                console.log('AiImageWizard: Found table/field from form data:', tableAndField);
                            }
                            break;
                        }
                    }
                }
            }
        }

        return tableAndField;
    }

    /**
     * Check if field has reached maxitems limit
     */
    hasReachedMaxItems(controlWrapper) {
        const containerFiles = controlWrapper.closest('typo3-formengine-container-files');
        if (!containerFiles) {
            return false;
        }

        // Check if other buttons are hidden (indicating maxitems reached)
        const otherButtons = controlWrapper.querySelectorAll('.t3js-element-browser, .t3js-drag-uploader');
        const hiddenButtons = Array.from(otherButtons).filter(btn => 
            btn.style.display === 'none' || btn.hasAttribute('hidden')
        );

        const hasReached = hiddenButtons.length > 0;
        
        if (this.debug) {
            console.log(`AiImageWizard: MaxItems reached: ${hasReached}`);
        }
        
        return hasReached;
    }

    addButtonsToFalFields() {
        if (this.debug) {
            console.log('AiImageWizard: Looking for file controls...');
        }

        // Find all file control wrappers
        const fileControls = document.querySelectorAll('.t3js-file-controls');
        
        if (this.debug) {
            console.log(`AiImageWizard: Found ${fileControls.length} file controls`);
        }
        
        fileControls.forEach(async (controlWrapper, index) => {
            if (this.debug) {
                console.log(`AiImageWizard: Processing file control ${index + 1}`);
            }

            // Check if maxitems is reached - if so, don't show AI button
            if (this.hasReachedMaxItems(controlWrapper)) {
                if (this.debug) {
                    console.log('AiImageWizard: MaxItems reached, not showing AI button');
                }
                
                // Remove existing AI button if maxitems reached
                const existingAiButton = controlWrapper.querySelector('.t3js-ai-image-generate-btn');
                if (existingAiButton) {
                    existingAiButton.remove();
                    if (this.debug) {
                        console.log('AiImageWizard: Removed existing AI button due to maxitems');
                    }
                }
                return;
            }

            // Check if we already added the AI button
            if (controlWrapper.querySelector('.t3js-ai-image-generate-btn')) {
                if (this.debug) {
                    console.log('AiImageWizard: AI button already exists, skipping');
                }
                return;
            }

            // Get the IRRE object identifier from existing buttons (including hidden ones)
            const existingButton = controlWrapper.querySelector('[data-file-irre-object]');
            if (!existingButton) {
                if (this.debug) {
                    console.log('AiImageWizard: No existing button with data-file-irre-object found');
                }
                return;
            }

            // Try to determine table and field
            const tableAndField = this.getTableAndFieldInfo(controlWrapper);

            if (!tableAndField) {
                if (this.debug) {
                    console.log('AiImageWizard: Could not determine table and field');
                }
                return;
            }

            // Check if this field is enabled for AI generation
            if (!this.isFieldEnabled(tableAndField.table, tableAndField.field)) {
                return;
            }

            const irreObject = existingButton.dataset.fileIrreObject;
            const targetFolder = existingButton.dataset.targetFolder || '1:/user_upload/';

            if (this.debug) {
                console.log('AiImageWizard: Adding AI button for', tableAndField, 'with irreObject:', irreObject);
            }
            
            // Get the icon HTML from TYPO3 Icons API
            const iconHtml = await Icons.getIcon(this.iconOn, Icons.sizes.small);
            
            // Create AI Image button
            const aiButton = document.createElement('button');
            aiButton.type = 'button';
            aiButton.className = 'btn btn-default t3js-ai-image-generate-btn';
            aiButton.title = 'Generate AI Image';
            aiButton.dataset.fileIrreObject = irreObject;
            aiButton.dataset.targetFolder = targetFolder;
            
            aiButton.innerHTML = `${iconHtml} Generate AI Image`;
            
            aiButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal(aiButton);
            });

            // Insert button as first button in the wrapper
            controlWrapper.insertBefore(aiButton, controlWrapper.firstChild);

            if (this.debug) {
                console.log('AiImageWizard: AI button added successfully');
            }
        });
    }

    openModal(button) {
        const irreObject = button.dataset.fileIrreObject;
        const targetFolder = button.dataset.targetFolder;
        
        // Create modal content as DOM elements
        const container = document.createElement('div');
        container.className = 'ai-image-generator';
        
        // Prompt field
        const promptGroup = document.createElement('div');
        promptGroup.className = 'form-group';
        const promptLabel = document.createElement('label');
        promptLabel.setAttribute('for', 'ai-prompt');
        promptLabel.textContent = 'Image Prompt';
        const promptTextarea = document.createElement('textarea');
        promptTextarea.id = 'ai-prompt';
        promptTextarea.className = 'form-control';
        promptTextarea.rows = 4;
        promptTextarea.placeholder = 'Describe the image you want to generate...';
        promptGroup.appendChild(promptLabel);
        promptGroup.appendChild(promptTextarea);
        
        // Size field
        const sizeGroup = document.createElement('div');
        sizeGroup.className = 'form-group';
        const sizeLabel = document.createElement('label');
        sizeLabel.setAttribute('for', 'ai-size');
        sizeLabel.textContent = 'Image Size';
        const sizeSelect = document.createElement('select');
        sizeSelect.id = 'ai-size';
        sizeSelect.className = 'form-control';
        const sizes = [
            { value: '1024x1024', label: '1024x1024 (Square)' },
            { value: '1024x1792', label: '1024x1792 (Portrait)' },
            { value: '1792x1024', label: '1792x1024 (Landscape)' }
        ];
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size.value;
            option.textContent = size.label;
            sizeSelect.appendChild(option);
        });
        sizeGroup.appendChild(sizeLabel);
        sizeGroup.appendChild(sizeSelect);
        
        // Preview area
        const previewDiv = document.createElement('div');
        previewDiv.id = 'ai-preview';
        previewDiv.className = 'ai-preview';
        previewDiv.style.display = 'none';
        previewDiv.style.marginBottom = '20px';
        const previewImg = document.createElement('img');
        previewImg.src = '';
        previewImg.alt = 'Generated Image';
        previewImg.className = 'img-fluid';
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '300px';
        previewDiv.appendChild(previewImg);

        // Storage/Folder selection (initially hidden)
        const saveOptionsDiv = document.createElement('div');
        saveOptionsDiv.id = 'ai-save-options';
        saveOptionsDiv.style.display = 'none';
        saveOptionsDiv.style.borderTop = '1px solid #ddd';
        saveOptionsDiv.style.paddingTop = '20px';
        saveOptionsDiv.style.marginTop = '20px';

        // Storage selection
        const storageGroup = document.createElement('div');
        storageGroup.className = 'form-group';
        const storageLabel = document.createElement('label');
        storageLabel.setAttribute('for', 'ai-storage');
        storageLabel.textContent = 'Storage';
        const storageSelect = document.createElement('select');
        storageSelect.id = 'ai-storage';
        storageSelect.className = 'form-control';
        storageGroup.appendChild(storageLabel);
        storageGroup.appendChild(storageSelect);

        // Folder selection
        const folderGroup = document.createElement('div');
        folderGroup.className = 'form-group';
        const folderLabel = document.createElement('label');
        folderLabel.setAttribute('for', 'ai-folder');
        folderLabel.textContent = 'Folder';
        const folderSelect = document.createElement('select');
        folderSelect.id = 'ai-folder';
        folderSelect.className = 'form-control';
        folderGroup.appendChild(folderLabel);
        folderGroup.appendChild(folderSelect);

        // Filename field
        const filenameGroup = document.createElement('div');
        filenameGroup.className = 'form-group';
        const filenameLabel = document.createElement('label');
        filenameLabel.setAttribute('for', 'ai-filename');
        filenameLabel.textContent = 'Filename';
        const filenameInput = document.createElement('input');
        filenameInput.type = 'text';
        filenameInput.id = 'ai-filename';
        filenameInput.className = 'form-control';
        filenameInput.value = 'ai_generated_' + Date.now() + '.png';
        filenameGroup.appendChild(filenameLabel);
        filenameGroup.appendChild(filenameInput);

        saveOptionsDiv.appendChild(storageGroup);
        saveOptionsDiv.appendChild(folderGroup);
        saveOptionsDiv.appendChild(filenameGroup);
        
        // Hidden fields
        const irreObjectInput = document.createElement('input');
        irreObjectInput.type = 'hidden';
        irreObjectInput.id = 'ai-irre-object';
        irreObjectInput.value = irreObject;
        
        const targetFolderInput = document.createElement('input');
        targetFolderInput.type = 'hidden';
        targetFolderInput.id = 'ai-target-folder';
        targetFolderInput.value = targetFolder;
        
        // Append all to container
        container.appendChild(promptGroup);
        container.appendChild(sizeGroup);
        container.appendChild(previewDiv);
        container.appendChild(saveOptionsDiv);
        container.appendChild(irreObjectInput);
        container.appendChild(targetFolderInput);

        // Storage change handler
        storageSelect.addEventListener('change', () => {
            this.loadFolders(storageSelect.value, folderSelect);
        });

        this.currentModal = Modal.advanced({
            title: 'Generate AI Image',
            content: container,
            size: Modal.sizes.large,
            buttons: [
                {
                    text: 'Cancel',
                    btnClass: 'btn-default',
                    trigger: () => {
                        this.currentModal.hideModal();
                    }
                },
                {
                    text: 'Generate',
                    btnClass: 'btn-primary',
                    trigger: () => {
                        this.generateImage();
                    }
                }
            ]
        });

        // Load storages after modal is shown
        this.loadStorages(storageSelect, folderSelect);
    }

    async loadStorages(storageSelect, folderSelect) {
        try {
            const ajaxUrl = TYPO3.settings.ajaxUrls?.ig_ai_images_storages || '/typo3/ig-ai-images/storages';
            const response = await new AjaxRequest(ajaxUrl).get();
            const result = await response.resolve();

            if (result.success && result.storages) {
                // Clear existing options
                storageSelect.innerHTML = '';
                
                // Add storage options
                let defaultStorageUid = null;
                result.storages.forEach(storage => {
                    const option = document.createElement('option');
                    option.value = storage.uid;
                    option.textContent = storage.name;
                    if (storage.isDefault) {
                        option.selected = true;
                        defaultStorageUid = storage.uid;
                    }
                    storageSelect.appendChild(option);
                });

                // Load folders for default storage
                if (defaultStorageUid) {
                    this.loadFolders(defaultStorageUid, folderSelect);
                }
            }
        } catch (error) {
            console.error('Failed to load storages:', error);
            Notification.error('Error', 'Failed to load available storages');
        }
    }

    async loadFolders(storageUid, folderSelect) {
        try {
            const ajaxUrl = TYPO3.settings.ajaxUrls?.ig_ai_images_folders || '/typo3/ig-ai-images/folders';
            const response = await new AjaxRequest(ajaxUrl + '?storage=' + storageUid).get();
            const result = await response.resolve();

            if (result.success && result.folders) {
                // Clear existing options
                folderSelect.innerHTML = '';
                
                // Add root option
                const rootOption = document.createElement('option');
                rootOption.value = '';
                rootOption.textContent = '/ (Root)';
                folderSelect.appendChild(rootOption);

                // Add folder options
                result.folders.forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder.path;
                    option.textContent = folder.path;
                    if (folder.path === 'user_upload/') {
                        option.selected = true;
                    }
                    folderSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
            Notification.error('Error', 'Failed to load folders');
        }
    }

    async generateImage() {
        // Get elements from the modal content
        const promptElement = this.currentModal.querySelector('#ai-prompt');
        const sizeElement = this.currentModal.querySelector('#ai-size');
        
        if (!promptElement || !sizeElement) {
            Notification.error('Error', 'Modal elements not found');
            return;
        }
        
        const prompt = promptElement.value;
        const size = sizeElement.value;

        if (!prompt) {
            Notification.error('Error', 'Please enter a prompt');
            return;
        }

        const generateBtn = this.currentModal.querySelectorAll('.btn-primary')[0];
        const originalText = generateBtn.textContent;
        generateBtn.disabled = true;
        
        // Update button icon to spinner
        const spinnerIcon = await Icons.getIcon(this.iconOff, Icons.sizes.small);
        generateBtn.innerHTML = `${spinnerIcon} Generating...`;

        try {
            const ajaxUrl = TYPO3.settings.ajaxUrls?.ig_ai_images_generate || '/typo3/ig-ai-images/generate';
            
            const response = await new AjaxRequest(ajaxUrl)
                .post({
                    prompt: prompt,
                    size: size
                });

            const result = await response.resolve();

            if (result.success) {
                // Store generated image data for later saving
                this.generatedImageData = {
                    url: result.url,
                    originalUrl: result.originalUrl,
                    prompt: result.prompt
                };

                // Show preview
                const preview = this.currentModal.querySelector('#ai-preview');
                const img = preview.querySelector('img');
                img.src = result.url;
                preview.style.display = 'block';

                // Show save options
                const saveOptions = this.currentModal.querySelector('#ai-save-options');
                saveOptions.style.display = 'block';

                Notification.success('Success', 'Image generated successfully!');
                
                // Update the button to "Save Image"
                const checkIcon = await Icons.getIcon('actions-document-save', Icons.sizes.small);
                generateBtn.innerHTML = `${checkIcon} Save Image`;
                generateBtn.disabled = false;
                generateBtn.onclick = () => {
                    this.saveGeneratedImage();
                };
            } else {
                Notification.error('Error', result.error || 'Failed to generate image');
                generateBtn.disabled = false;
                
                // Reset to original icon
                const originalIcon = await Icons.getIcon(this.iconOn, Icons.sizes.small);
                generateBtn.innerHTML = `${originalIcon} ${originalText}`;
            }
        } catch (error) {
            if (this.currentModal && document.body.contains(this.currentModal)) {
                Notification.error('Error', 'Failed to generate image: ' + error.message);
            }
            generateBtn.disabled = false;
            
            // Reset to original icon
            const originalIcon = await Icons.getIcon(this.iconOn, Icons.sizes.small);
            generateBtn.innerHTML = `${originalIcon} ${originalText}`;
        }
    }

    async saveGeneratedImage() {
        if (!this.generatedImageData) {
            Notification.error('Error', 'No generated image to save');
            return;
        }

        const storageSelect = this.currentModal.querySelector('#ai-storage');
        const folderSelect = this.currentModal.querySelector('#ai-folder');
        const filenameInput = this.currentModal.querySelector('#ai-filename');
        const irreObjectInput = this.currentModal.querySelector('#ai-irre-object');

        const storage = storageSelect.value;
        const folder = folderSelect.value || 'user_upload/';
        const filename = filenameInput.value;
        const irreObject = irreObjectInput.value;

        if (!filename) {
            Notification.error('Error', 'Please enter a filename');
            return;
        }

        const saveBtn = this.currentModal.querySelectorAll('.btn-primary')[0];
        saveBtn.disabled = true;
        
        const spinnerIcon = await Icons.getIcon(this.iconOff, Icons.sizes.small);
        saveBtn.innerHTML = `${spinnerIcon} Saving...`;

        try {
            const ajaxUrl = TYPO3.settings.ajaxUrls?.ig_ai_images_save || '/typo3/ig-ai-images/save';
            
            const response = await new AjaxRequest(ajaxUrl)
                .post({
                    imageUrl: this.generatedImageData.originalUrl,
                    filename: filename,
                    storage: storage,
                    folder: folder
                });

            const result = await response.resolve();

            if (result.success) {
                // Use the saved image
                this.useGeneratedImage(result.fileUid, irreObject);
            } else {
                Notification.error('Error', result.error || 'Failed to save image');
                saveBtn.disabled = false;
                
                const saveIcon = await Icons.getIcon('actions-document-save', Icons.sizes.small);
                saveBtn.innerHTML = `${saveIcon} Save Image`;
            }
        } catch (error) {
            Notification.error('Error', 'Failed to save image: ' + error.message);
            saveBtn.disabled = false;
            
            const saveIcon = await Icons.getIcon('actions-document-save', Icons.sizes.small);
            saveBtn.innerHTML = `${saveIcon} Save Image`;
        }
    }

    useGeneratedImage(fileUid, irreObject) {
        // TYPO3 uses postMessage to communicate between element browser and inline containers
        const message = {
            actionName: 'typo3:foreignRelation:insert',
            objectGroup: irreObject,
            table: 'sys_file',
            uid: fileUid
        };
        
        MessageUtility.send(message);
        
        Notification.success('Success', 'Image has been saved and added to the field');
        
        // Close modal and clean up
        this.currentModal.hideModal();
        this.currentModal = null;
        this.generatedImageData = null;
        
        // Refresh buttons after adding image
        setTimeout(() => {
            this.addButtonsToFalFields();
        }, 500);
    }
}

// Initialize when module is loaded
const aiImageWizard = new AiImageWizard();

export default aiImageWizard;