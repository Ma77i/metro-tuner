document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmValueSpan = document.getElementById('bpm-value');
    const timeSigValueSpan = document.getElementById('time-sig-value');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const timeSigSelect = document.getElementById('time-sig-select');
    const visualIndicator = document.getElementById('visual-indicator');
    const volumeSlider = document.getElementById('volume-slider');

    // Metronome State
    let bpm = 120;
    let beatsPerMeasure = 4;
    let isPlaying = false;
    let timer = null;
    let beatCount = 0;
    let audioContext = null;
    let masterGain = null;

    // --- Audio Functions ---
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            metronomeController.updateVolume(volumeSlider.value); // Set initial volume
        }
    }

    function playSound(isFirstBeat) {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.001);
        oscillator.frequency.setValueAtTime(isFirstBeat ? 880 : 440, now);
        oscillator.type = 'sine';
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.05);
    }

    // --- Metronome Logic ---
    function togglePlay() {
        if (!audioContext) initAudio();
        if (isPlaying) stopMetronome();
        else startMetronome();
    }

    function startMetronome() {
        isPlaying = true;
        playPauseBtn.textContent = 'Pause';
        beatCount = 0;
        const interval = 60000 / bpm;
        playTick();
        timer = setInterval(playTick, interval);
    }

    function stopMetronome() {
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        clearInterval(timer);
        timer = null;
        clearVisuals();
    }

    function playTick() {
        beatCount++;
        if (beatCount > beatsPerMeasure) beatCount = 1;
        const isFirstBeat = beatCount === 1;
        playSound(isFirstBeat);
        visualBeat(beatCount, isFirstBeat);
    }

    // --- UI / Visuals ---
    function createBeatCircles() {
        visualIndicator.innerHTML = '';
        for (let i = 0; i < beatsPerMeasure; i++) {
            const circle = document.createElement('div');
            circle.classList.add('beat-circle');
            visualIndicator.appendChild(circle);
        }
    }

    function visualBeat(currentBeat, isFirstBeat) {
        const circles = visualIndicator.children;
        for (let i = 0; i < circles.length; i++) {
            circles[i].classList.remove('active', 'accent');
        }
        const activeCircle = circles[currentBeat - 1];
        if (activeCircle) {
            activeCircle.classList.add('active');
            if (isFirstBeat) activeCircle.classList.add('accent');
        }
    }

    function clearVisuals() {
        const circles = visualIndicator.children;
        for (let i = 0; i < circles.length; i++) {
            circles[i].classList.remove('active', 'accent');
        }
    }

    // --- Controller for external access ---
    const metronomeController = {
        updateBpm(newBpm) {
            bpm = parseInt(newBpm);
            bpmSlider.value = bpm;
            bpmValueSpan.textContent = bpm;

            document.querySelectorAll('#preset-buttons-container .preset-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.bpm) === bpm);
            });

            if (isPlaying) {
                stopMetronome();
                startMetronome();
            }
        },

        updateTimeSignature(newTimeSig) {
            timeSigSelect.value = newTimeSig;
            beatsPerMeasure = parseInt(newTimeSig.split('/')[0]);
            timeSigValueSpan.textContent = newTimeSig;

            for (const option of timeSigSelect.options) {
                const text = option.text.replace(' ✓', '');
                option.text = option.value === newTimeSig ? text + ' ✓' : text;
            }

            createBeatCircles();
            if (isPlaying) {
                stopMetronome();
                startMetronome();
            }
        },

        updateVolume(newVolume) {
            volumeSlider.value = newVolume;
            if (masterGain) {
                masterGain.gain.value = newVolume / 100;
            }
        },

        init() {
            this.updateBpm(120);
            this.updateTimeSignature('4/4');
            this.updateVolume(100);
        }
    };

    // Event Listeners
    bpmSlider.addEventListener('input', () => metronomeController.updateBpm(bpmSlider.value));
    timeSigSelect.addEventListener('change', () => metronomeController.updateTimeSignature(timeSigSelect.value));
    volumeSlider.addEventListener('input', () => metronomeController.updateVolume(volumeSlider.value));
    playPauseBtn.addEventListener('click', togglePlay);

    // Make controller globally accessible
    window.metronomeController = metronomeController;

    // Initial setup is now handled by settings.js, which calls init() after populating presets
});
