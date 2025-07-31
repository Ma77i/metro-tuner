document.addEventListener('DOMContentLoaded', () => {
    const tunerBtn = document.getElementById('tuner-btn');
    const metronomeBtn = document.getElementById('metronome-btn');
    const settingsBtn = document.getElementById('settings-btn'); // Added this
    const tunerView = document.getElementById('tuner-view');
    const metronomeView = document.getElementById('metronome-view');

    tunerBtn.addEventListener('click', () => {
        tunerBtn.classList.add('active');
        metronomeBtn.classList.remove('active');
        tunerView.classList.add('active');
        metronomeView.classList.remove('active');
    });

    metronomeBtn.addEventListener('click', () => {
        metronomeBtn.classList.add('active');
        tunerBtn.classList.remove('active');
        metronomeView.classList.add('active');
        tunerView.classList.remove('active');
    });

    // Added this for the settings modal
    settingsBtn.addEventListener('click', () => {
        if (window.openSettingsModal) {
            window.openSettingsModal();
        }
    });
});
