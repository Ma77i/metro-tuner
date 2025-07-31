
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const configNameInput = document.getElementById('config-name-input');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const savedConfigsList = document.getElementById('saved-configs-list');
    const presetNameInput = document.getElementById('preset-name-input');
    const presetBpmInput = document.getElementById('preset-bpm-input');
    const addPresetBtn = document.getElementById('add-preset-btn');
    const customPresetsList = document.getElementById('custom-presets-list');
    const exportConfigsBtn = document.getElementById('export-configs-btn');
    const importFileInput = document.getElementById('import-file-input');
    const generateShareUrlBtn = document.getElementById('generate-share-url-btn');
    const copyShareUrlBtn = document.getElementById('copy-share-url-btn');
    const shareUrlInput = document.getElementById('share-url-input');
    const toastContainer = document.getElementById('toast-container');

    // State
    let savedConfigs = JSON.parse(localStorage.getItem('proTunerConfigs')) || [];
    let customPresets = JSON.parse(localStorage.getItem('proTunerCustomPresets')) || [];

    // --- Core Functions ---

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }

    function getCurrentSettings() {
        return {
            tuner: {
                tuning: document.getElementById('tuning-select').value,
            },
            metronome: {
                bpm: document.getElementById('bpm-slider').value,
                timeSig: document.getElementById('time-sig-select').value,
                volume: document.getElementById('volume-slider').value,
            }
        };
    }

    function applySettings(config) {
        if (window.tunerController && config.tuner) {
            window.tunerController.setTuning(config.tuner.tuning);
        }
        if (window.metronomeController && config.metronome) {
            const metro = window.metronomeController;
            metro.updateBpm(config.metronome.bpm);
            metro.updateTimeSignature(config.metronome.timeSig);
            metro.updateVolume(config.metronome.volume);
        }
        showToast('Configuración cargada!', 'success');
        closeModal();
    }

    function saveConfiguration() {
        const name = configNameInput.value.trim();
        if (!name) {
            showToast('Por favor, introduce un nombre para la configuración.', 'error');
            return;
        }
        const newConfig = {
            id: Date.now(),
            name: name,
            createdAt: new Date().toISOString(),
            settings: getCurrentSettings()
        };
        savedConfigs.push(newConfig);
        localStorage.setItem('proTunerConfigs', JSON.stringify(savedConfigs));
        renderSavedConfigs();
        configNameInput.value = '';
        showToast('Configuración guardada!', 'success');
    }

    function deleteConfiguration(id) {
        savedConfigs = savedConfigs.filter(c => c.id !== id);
        localStorage.setItem('proTunerConfigs', JSON.stringify(savedConfigs));
        renderSavedConfigs();
        showToast('Configuración eliminada.', 'info');
    }

    function renderSavedConfigs() {
        savedConfigsList.innerHTML = '';
        if (savedConfigs.length === 0) {
            savedConfigsList.innerHTML = '<p>No hay configuraciones guardadas.</p>';
            return;
        }
        savedConfigs.forEach(config => {
            const summary = `${config.settings.tuner.tuning.split('|')[0]} @ ${config.settings.metronome.bpm} BPM`;
            const date = new Date(config.createdAt).toLocaleDateString();
            const item = document.createElement('div');
            item.className = 'config-item';
            item.innerHTML = `
                <div class="config-details">
                    <strong>${config.name}</strong>
                    <span class="meta">${summary} - ${date}</span>
                </div>
                <div class="config-actions">
                    <button data-id="${config.id}" class="load-btn">✔️ Cargar</button>
                    <button data-id="${config.id}" class="delete-btn">🗑️ Borrar</button>
                </div>
            `;
            savedConfigsList.appendChild(item);
        });
        savedConfigsList.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const configToLoad = savedConfigs.find(c => c.id === id);
                if (configToLoad) applySettings(configToLoad.settings);
            });
        });
        savedConfigsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteConfiguration(parseInt(e.target.dataset.id));
            });
        });
    }

    // --- Custom Presets ---
    const defaultPresets = [
        { name: 'Largo', bpm: 50 }, { name: 'Andante', bpm: 70 }, { name: 'Moderato', bpm: 110 },
        { name: 'Allegro', bpm: 140 }, { name: 'Presto', bpm: 180 }, { name: 'Rock', bpm: 100 },
        { name: 'Ballad', bpm: 80 }, { name: 'Funk', bpm: 115 },
    ];

    function saveCustomPreset() {
        const name = presetNameInput.value.trim();
        const bpm = parseInt(presetBpmInput.value);
        if (!name || !bpm) {
            showToast('Por favor, introduce un nombre y un BPM para el preset.', 'error');
            return;
        }
        const newPreset = { id: Date.now(), name, bpm };
        customPresets.push(newPreset);
        localStorage.setItem('proTunerCustomPresets', JSON.stringify(customPresets));
        renderCustomPresets();
        populatePresetButtons();
        presetNameInput.value = '';
        presetBpmInput.value = '';
        showToast('Preset personalizado guardado!', 'success');
    }

    function deleteCustomPreset(id) {
        customPresets = customPresets.filter(p => p.id !== id);
        localStorage.setItem('proTunerCustomPresets', JSON.stringify(customPresets));
        renderCustomPresets();
        populatePresetButtons();
        showToast('Preset eliminado.', 'info');
    }

    function renderCustomPresets() {
        customPresetsList.innerHTML = '';
        if (customPresets.length === 0) {
            customPresetsList.innerHTML = '<p>No hay presets personalizados.</p>';
            return;
        }
        customPresets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'config-item';
            item.innerHTML = `
                <div class="config-details"><strong>${preset.name} (${preset.bpm} BPM)</strong></div>
                <div class="config-actions"><button data-id="${preset.id}" class="delete-preset-btn">🗑️ Borrar</button></div>
            `;
            customPresetsList.appendChild(item);
        });
        customPresetsList.querySelectorAll('.delete-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteCustomPreset(parseInt(e.target.dataset.id));
            });
        });
    }

    function populatePresetButtons() {
        const container = document.getElementById('preset-buttons-container');
        if (!container) return;
        container.innerHTML = '';
        const allPresets = [...defaultPresets, ...customPresets];
        allPresets.forEach(preset => {
            const button = document.createElement('button');
            button.className = 'preset-btn';
            button.dataset.bpm = preset.bpm;
            button.textContent = `${preset.name} (${preset.bpm})`;
            button.addEventListener('click', () => {
                if (window.metronomeController) window.metronomeController.updateBpm(preset.bpm);
            });
            container.appendChild(button);
        });
    }

    // --- Import / Export ---
    function exportSettings() {
        const data = { version: '1.0', configs: savedConfigs, customPresets: customPresets };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pro_tuner_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Configuraciones exportadas!', 'success');
    }

    function importSettings(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/json') {
            showToast('Por favor, selecciona un archivo JSON válido.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.version || !data.configs || !data.customPresets) throw new Error('Formato de archivo inválido.');
                const incomingConfigIds = new Set(data.configs.map(c => c.id));
                const existingConfigs = savedConfigs.filter(c => !incomingConfigIds.has(c.id));
                savedConfigs = [...existingConfigs, ...data.configs];
                const incomingPresetIds = new Set(data.customPresets.map(p => p.id));
                const existingPresets = customPresets.filter(p => !incomingPresetIds.has(p.id));
                customPresets = [...existingPresets, ...data.customPresets];
                localStorage.setItem('proTunerConfigs', JSON.stringify(savedConfigs));
                localStorage.setItem('proTunerCustomPresets', JSON.stringify(customPresets));
                renderSavedConfigs();
                renderCustomPresets();
                populatePresetButtons();
                showToast('Configuraciones importadas y fusionadas!', 'success');
            } catch (error) {
                showToast(`Error al importar: ${error.message}`, 'error');
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    // --- Sharing ---
    function generateShareUrl() {
        try {
            const settings = getCurrentSettings();
            const jsonString = JSON.stringify(settings);
            const base64String = btoa(encodeURIComponent(jsonString));
            const url = `${window.location.origin}${window.location.pathname}?config=${base64String}`;
            shareUrlInput.value = url;
            showToast('URL generada!', 'success');
        } catch (error) {
            showToast('Error al generar la URL.', 'error');
        }
    }

    function copyToClipboard() {
        if (!shareUrlInput.value) {
            showToast('Primero genera una URL.', 'error');
            return;
        }
        shareUrlInput.select();
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            showToast('URL copiada al portapapeles!', 'success');
        }, () => {
            showToast('Error al copiar la URL.', 'error');
        });
    }

    function loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const configParam = params.get('config');
        if (configParam) {
            try {
                const jsonString = decodeURIComponent(atob(configParam));
                const settings = JSON.parse(jsonString);
                applySettings(settings);
                showToast('Configuración cargada desde URL!', 'info');
                const newUrl = `${window.location.origin}${window.location.pathname}`;
                window.history.replaceState({}, document.title, newUrl);
            } catch (error) {
                showToast('No se pudo cargar la configuración desde la URL.', 'error');
            }
        }
    }

    // --- Modal Control ---
    function openModal() { settingsModal.style.display = 'flex'; }
    function closeModal() { settingsModal.style.display = 'none'; }

    // --- Event Listeners ---
    closeModalBtn.addEventListener('click', closeModal);
    saveConfigBtn.addEventListener('click', saveConfiguration);
    addPresetBtn.addEventListener('click', saveCustomPreset);
    exportConfigsBtn.addEventListener('click', exportSettings);
    document.getElementById('import-file-input').addEventListener('click', () => document.getElementById('import-file-input').click());
    importFileInput.addEventListener('change', importSettings);
    generateShareUrlBtn.addEventListener('click', generateShareUrl);
    copyShareUrlBtn.addEventListener('click', copyToClipboard);

    // Make openModal globally accessible
    window.openSettingsModal = openModal;

    // --- Initial Load ---
    function initialize() {
        populatePresetButtons();
        if(window.metronomeController) window.metronomeController.init();
        if(window.tunerController) window.tunerController.init();
        renderSavedConfigs();
        renderCustomPresets();
        loadFromUrl();
    }

    initialize();
});
