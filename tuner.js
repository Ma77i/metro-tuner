document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const noteNameEl = document.querySelector('.note-name');
    const centsDisplayEl = document.querySelector('.cents-display');
    const noteHzEl = document.querySelector('.note-hz');
    const accuracyIndicatorEl = document.querySelector('.accuracy-indicator');
    const tuningSelectEl = document.getElementById('tuning-select');
    const instrumentLabelEl = document.getElementById('instrument-label');
    const headstockLeftEl = document.getElementById('headstock-left');
    const headstockRightEl = document.getElementById('headstock-right');
    const micToggleEl = document.getElementById('mic-toggle');

    // Audio & Tuner State
    let audioContext, analyser, dataArray, mediaStreamSource;
    let noteAudioContext; // Separate context for playing reference notes
    let isListening = false;
    let animationFrameId = null;
    const A4 = 440;
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let currentTuning = {};

    const tunings = {
        "Guitarra (6 Cuerdas)": {
            "Estándar": ["E4", "B3", "G3", "D3", "A2", "E2"],
            "Drop D": ["E4", "B3", "G3", "D3", "A2", "D2"],
        },
        "Bajo (4 Cuerdas)": {
            "Estándar": ["G2", "D2", "A1", "E1"],
        },
        "Violín": { "Estándar": ["E5", "A4", "D4", "G3"] },
        "Viola": { "Estándar": ["A4", "D4", "G3", "C3"] },
        "Violonchelo": { "Estándar": ["A3", "D3", "G2", "C2"] },
        "Ukelele": { "Estándar (GCEA)": ["A4", "E4", "C4", "G4"] },
    };

    const headstockLayouts = {
        "Guitarra (6 Cuerdas)": { left: 3, right: 3 },
        "Bajo (4 Cuerdas)": { left: 2, right: 2 },
        "Violín": { left: 2, right: 2 },
        "Viola": { left: 2, right: 2 },
        "Violonchelo": { left: 2, right: 2 },
        "Ukelele": { left: 2, right: 2 },
        "default": { left: 0, right: 99 }
    };

    // --- Controller for external access ---
    const tunerController = {
        setTuning(tuningValue) {
            tuningSelectEl.value = tuningValue;
            const [instrument, tuningName] = tuningValue.split('|');
            currentTuning.notes = tunings[instrument][tuningName];
            currentTuning.instrument = instrument;
            instrumentLabelEl.textContent = `${instrument} - ${tuningName}`;
            this.renderHeadstockDisplay();
        },

        renderHeadstockDisplay() {
            headstockLeftEl.innerHTML = '';
            headstockRightEl.innerHTML = '';
            const layout = headstockLayouts[currentTuning.instrument] || headstockLayouts.default;
            
            currentTuning.notes.forEach((noteName, index) => {
                const freq = this.noteToFreq(noteName);
                const noteEl = document.createElement('div');
                noteEl.className = 'ref-note';
                noteEl.dataset.note = noteName;
                noteEl.dataset.freq = freq;
                noteEl.innerHTML = `
                    <div class="ref-note-name">${noteName.slice(0, -1)}</div>
                    <div class="ref-note-hz">${freq.toFixed(1)} Hz</div>
                `;
                noteEl.addEventListener('click', () => this.playReferenceNote(freq));
    
                if (index < layout.left) {
                    headstockLeftEl.appendChild(noteEl);
                } else {
                    headstockRightEl.appendChild(noteEl);
                }
            });
        },

        toggleMic(forceState) {
            const shouldBeOn = typeof forceState === 'boolean' ? forceState : micToggleEl.checked;
            micToggleEl.checked = shouldBeOn;
            if (shouldBeOn) this.startListening();
            else this.stopListening();
        },

        startListening() {
            if (isListening) return;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 8192;
            dataArray = new Float32Array(analyser.frequencyBinCount);
    
            navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } })
                .then(stream => {
                    isListening = true;
                    mediaStreamSource = audioContext.createMediaStreamSource(stream);
                    mediaStreamSource.connect(analyser);
                    this.updatePitch();
                })
                .catch(err => {
                    console.error('Error accessing microphone:', err);
                    alert('Error al acceder al micrófono. Por favor, permite el acceso.');
                    micToggleEl.checked = false;
                });
        },
    
        stopListening() {
            if (!isListening || !mediaStreamSource) return;
            cancelAnimationFrame(animationFrameId);
            mediaStreamSource.mediaStream.getTracks().forEach(track => track.stop());
            audioContext.close();
            isListening = false;
            this.resetUI();
        },

        playReferenceNote(freq) {
            if (!noteAudioContext) {
                noteAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            const oscillator = noteAudioContext.createOscillator();
            const gainNode = noteAudioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(noteAudioContext.destination);
            const now = noteAudioContext.currentTime;
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            oscillator.frequency.setValueAtTime(freq, now);
            oscillator.type = 'triangle';
            oscillator.start(now);
            oscillator.stop(now + 0.8);
        },

        updatePitch() {
            analyser.getFloatTimeDomainData(dataArray);
            const pitch = this.getPitch(dataArray, audioContext.sampleRate);
    
            if (pitch) {
                const targetNote = this.findClosestNote(pitch);
                const cents = this.getCents(pitch, targetNote.freq);
                this.updateUI(pitch, targetNote, cents);
            } else {
                this.resetUI(false);
            }
            animationFrameId = requestAnimationFrame(() => this.updatePitch());
        },

        updateUI(pitch, targetNote, cents) {
            noteNameEl.textContent = targetNote.name.slice(0, -1);
            noteHzEl.textContent = `${pitch.toFixed(2)} Hz`;
            centsDisplayEl.textContent = `${cents.toFixed(1)} cents`;
    
            const accuracy = Math.max(-50, Math.min(50, cents));
            accuracyIndicatorEl.style.left = `${50 + accuracy}%`;
    
            noteNameEl.className = 'note-name';
            accuracyIndicatorEl.className = 'accuracy-indicator';
    
            if (Math.abs(cents) < 2) {
                noteNameEl.classList.add('tuned');
                accuracyIndicatorEl.classList.add('tuned');
            } else if (Math.abs(cents) < 10) {
                accuracyIndicatorEl.classList.add('close');
            } else {
                accuracyIndicatorEl.classList.add('off');
            }
    
            document.querySelectorAll('.ref-note').forEach(noteEl => {
                noteEl.classList.toggle('active', noteEl.dataset.note === targetNote.name);
            });
        },

        resetUI(fullReset = true) {
            if (fullReset) {
                noteNameEl.textContent = '--';
                noteHzEl.textContent = 'Toca una cuerda';
                centsDisplayEl.textContent = '0 cents';
            }
            accuracyIndicatorEl.style.left = '50%';
            noteNameEl.className = 'note-name';
            accuracyIndicatorEl.className = 'accuracy-indicator';
            document.querySelectorAll('.ref-note.active').forEach(el => el.classList.remove('active'));
        },

        noteToFreq(note) {
            const noteNameOnly = note.slice(0, -1).replace('b', '#');
            const octave = parseInt(note.slice(-1));
            const keyNumber = noteStrings.indexOf(noteNameOnly);
            if (keyNumber === -1) return null;
            const noteIndex = keyNumber + (octave + 1) * 12;
            return A4 * Math.pow(2, (noteIndex - 57) / 12);
        },

        findClosestNote(freq) {
            let closestNote = { name: '', freq: 0 };
            let minDistance = Infinity;
            currentTuning.notes.forEach(noteName => {
                const targetFreq = this.noteToFreq(noteName);
                if (!targetFreq) return;
                const distance = Math.abs(freq - targetFreq);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestNote = { name: noteName, freq: targetFreq };
                }
            });
            return closestNote;
        },

        getCents(freq1, freq2) {
            return 1200 * Math.log2(freq1 / freq2);
        },

        getPitch(buffer, sampleRate) {
            const threshold = 0.1;
            const bufferSize = buffer.length;
            let yinBuffer = new Float32Array(Math.floor(bufferSize / 2));
            let period, pitch, probability = 0;
            let rms = 0;
            for (let i = 0; i < bufferSize; i++) {
                let val = buffer[i];
                rms += val * val;
            }
            rms = Math.sqrt(rms / bufferSize);
            if (rms < 0.01) return null;
            let tau;
            for (tau = 0; tau < yinBuffer.length; tau++) yinBuffer[tau] = 0;
            for (tau = 1; tau < yinBuffer.length; tau++) {
                for (let i = 0; i < yinBuffer.length; i++) {
                    yinBuffer[tau] += Math.pow(buffer[i] - buffer[i + tau], 2);
                }
            }
            let runningSum = 0;
            yinBuffer[0] = 1;
            for (tau = 1; tau < yinBuffer.length; tau++) {
                runningSum += yinBuffer[tau];
                yinBuffer[tau] *= tau / runningSum;
            }
            for (tau = 2; tau < yinBuffer.length; tau++) {
                if (yinBuffer[tau] < threshold) {
                    while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) tau++;
                    probability = 1 - yinBuffer[tau];
                    period = tau;
                    break;
                }
            }
            if (period && probability > 0.9) {
                if (period > 0 && period < yinBuffer.length - 1) {
                    const periodValue = period + (yinBuffer[period+1] - yinBuffer[period-1]) / (2 * (2 * yinBuffer[period] - yinBuffer[period-1] - yinBuffer[period+1]));
                    pitch = sampleRate / periodValue;
                } else {
                    pitch = sampleRate / period;
                }
                return pitch;
            }
            return null;
        },

        init() {
            populateTunings();
            this.setTuning(tuningSelectEl.value);
        }
    };

    // Event Listeners
    tuningSelectEl.addEventListener('change', () => tunerController.setTuning(tuningSelectEl.value));
    micToggleEl.addEventListener('change', () => tunerController.toggleMic());

    // Make controller globally accessible
    window.tunerController = tunerController;

    function populateTunings() {
        for (const instrument in tunings) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = instrument;
            for (const tuningName in tunings[instrument]) {
                const option = document.createElement('option');
                option.value = `${instrument}|${tuningName}`;
                option.textContent = tuningName;
                optgroup.appendChild(option);
            }
            tuningSelectEl.appendChild(optgroup);
        }
    }

    tunerController.init();
});