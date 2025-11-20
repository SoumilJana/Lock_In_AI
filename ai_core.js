/**
 * AI CORE
 * This file handles:
 * 1. Loading the TensorFlow Model
 * 2. Detecting objects (Phones)
 * 3. Managing the Punishment State
 */

// Global State Variables (Shared with UI)
let model = null;
let isPunished = false;
let isGracePeriod = false;
const CONFIDENCE_THRESHOLD = 0.70; 

// Define global flag for session state (shared with ui_controller.js)
window.isSessionActive = false;

// --- 1. INITIALIZATION ---
async function loadAIModel() {
    try {
        console.log("Loading COCO-SSD Model...");
        model = await cocoSsd.load();
        console.log("Model Loaded Successfully.");
        return true;
    } catch (err) {
        console.error("Failed to load model:", err);
        alert("Error loading AI. Check console.");
        return false;
    }
}

// --- 2. DETECTION LOOP ---
async function detectFrame() {
    // Access DOM elements here to ensure they exist
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // 1. Check Global Session State
    // If session is NOT active, we clear canvas and STOP recursion.
    if (!window.isSessionActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return; 
    }

    // 2. Canvas Clearing logic
    // We ALWAYS clear the canvas at the start of the frame.
    // This fixes the "glitch" where red boxes stay on screen.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Run Detection (Only if NOT punished and video is ready)
    if (!isPunished && video.readyState === 4) {
        
        if (model) {
            const predictions = await model.detect(video);
            let phoneDetected = false;

            predictions.forEach(prediction => {
                const [x, y, width, height] = prediction.bbox;
                const text = prediction.class;
                const score = prediction.score;

                if (text === 'cell phone') {
                    if (isGracePeriod) {
                        drawBox(ctx, x, y, width, height, text, score, '#ffeb3b'); // Yellow (Grace)
                    } else {
                        drawBox(ctx, x, y, width, height, text, score, '#ff1744'); // Red (Danger)
                        
                        // MARK DETECTION
                        if(score > CONFIDENCE_THRESHOLD) phoneDetected = true;
                    }
                } else if (text === 'person') {
                    // Optional: Draw green box for person
                    // drawBox(ctx, x, y, width, height, text, score, '#00e676'); 
                }
            });

            // 4. TRIGGER PUNISHMENT
            if (phoneDetected && !isGracePeriod) {
                triggerPunishment();
            }
        }
    }
    
    // 5. Loop Recursion
    // We request the next frame regardless of punishment state,
    // keeping the app "alive" in the background.
    requestAnimationFrame(detectFrame);
}

// Helper to draw boxes
function drawBox(ctx, x, y, w, h, text, score, color) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.rect(x, y, w, h);
    ctx.stroke();
    
    ctx.font = 'bold 18px Arial';
    ctx.fillText(text + " " + Math.round(score*100) + "%", x, y - 10);
}

// --- 3. PUNISHMENT TRIGGERS ---
function triggerPunishment() {
    isPunished = true;
    
    // Call global UI function
    if(window.showPunishmentOverlay) {
        window.showPunishmentOverlay();
    }
}