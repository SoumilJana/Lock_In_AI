/**
 * UI CONTROLLER
 * This file handles:
 * 1. DOM Elements & Buttons
 * 2. Timer Logic
 * 3. View Switching (Setup <-> Monitor)
 * 4. Linking AI to the Screen
 */

// DOM Elements
const setupView = document.getElementById('setup-view');
const monitorView = document.getElementById('monitor-view');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const forgiveBtn = document.getElementById('forgive-btn');
const loadStatus = document.getElementById('load-status');

const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');

const overlay = document.getElementById('overlay');
const guiltVideo = document.getElementById('guilt-video');
const alarmSound = document.getElementById('alarm-sound');

// Timer State
let timerInterval = null;
let totalSeconds = 0;
// Note: window.isSessionActive is defined in ai_core.js, but we write to it here.

// --- 1. STARTUP ---
async function initApp() {
    // Load AI from ai_core.js
    const modelLoaded = await loadAIModel();
    
    if (modelLoaded) {
        // Setup Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Enable UI
            startBtn.disabled = false;
            startBtn.innerText = "START FOCUS SESSION";
            loadStatus.innerText = "System Ready.";
            
            // We do NOT start detectFrame here yet. 
            // We wait for the start button.
        };
    }
}

// --- 2. SESSION HANDLERS ---
startBtn.addEventListener('click', () => {
    const topic = document.getElementById('topic-input').value;
    const minutes = parseInt(document.getElementById('time-input').value);

    if (!topic || !minutes || minutes <= 0) {
        alert("Please enter a valid topic and time.");
        return;
    }

    // Update UI
    document.getElementById('display-topic').innerText = topic;
    totalSeconds = minutes * 60;
    updateTimerDisplay();

    // Switch Views
    setupView.style.display = 'none';
    monitorView.style.display = 'flex';

    // Start Logic
    // We set the global flag to true
    window.isSessionActive = true;
    
    // Start the AI Loop
    detectFrame();
    
    startTimer();
});

stopBtn.addEventListener('click', stopSession);

function startTimer() {
    timerInterval = setInterval(() => {
        totalSeconds--;
        updateTimerDisplay();
        
        if (totalSeconds <= 0) {
            completeSession();
        }
    }, 1000);
}

function stopSession() {
    clearInterval(timerInterval);
    
    // Stop AI loop logic
    window.isSessionActive = false;
    
    // Note: The loop in ai_core.js will see this flag is false
    // and will stop calling requestAnimationFrame on its own.

    // Reset View
    setupView.style.display = 'flex';
    monitorView.style.display = 'none';
    
    // Reset Audio/Video
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

function completeSession() {
    stopSession();
    // Victory Sound
    const audio = new Audio('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg');
    audio.play();
    alert("SESSION COMPLETE! Great job staying focused.");
}

function updateTimerDisplay() {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
}

// --- 3. PUNISHMENT HANDLERS (Called by AI) ---
window.showPunishmentOverlay = function() {
    overlay.style.display = 'flex';
    
    // Media
    guiltVideo.play();
    alarmSound.currentTime = 0;
    alarmSound.volume = 1.0;
    alarmSound.play();

    // TTS
    const utterance = new SpeechSynthesisUtterance("Phone Detected. Put it away now.");
    window.speechSynthesis.speak(utterance);
}

forgiveBtn.addEventListener('click', () => {
    // Reset State in ai_core.js
    isPunished = false;
    isGracePeriod = true;
    
    // Hide Overlay
    overlay.style.display = 'none';
    guiltVideo.pause();
    alarmSound.pause();
    window.speechSynthesis.cancel();

    // Grace Period Visuals
    statusText.innerText = "GRACE PERIOD: Put phone away...";
    statusText.className = "status-bar grace-period";
    
    setTimeout(() => {
        isGracePeriod = false;
        statusText.innerText = "Session Active. Monitoring for phones...";
        statusText.className = "status-bar";
    }, 3000);
});

// Start App
initApp();