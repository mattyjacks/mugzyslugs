/* ==========================================================================
   MUGZYSLUGS - THE SLUG PIT
   Interactive Engine: Slug Follower, Slime Physics, Web Audio Synthesizer,
   Twitch Integration (twitch.tv/mugzyslugs) & Soundboard
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. Global State & Audio Context
       ========================================================================== */
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Slime stats & companion state
    const state = {
        companionEnabled: true,
        slimeColor: '#39ff14',
        slimeGlow: 'rgba(57, 255, 20, 0.75)',
        totalSlimeXp: 0,
        slimeLevel: 1,
        targetPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        slugPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        slugVel: { x: 0, y: 0 },
        slugAngle: 0,
        walkCycle: 0,
        isCrawling: false,
        activeFood: null
    };

    /* ==========================================================================
       2. Fullscreen Slime Trail Canvas & Splatter Physics
       ========================================================================== */
    const canvas = document.getElementById('trail-canvas');
    const ctx = canvas.getContext('2d');

    let trailPoints = [];
    let splatters = [];
    const maxTrailPoints = 45;
    const baseTrailWidth = 14;

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Spawn slime splatter explosion on click/tap
    function createSlimeSplatter(x, y, count = 12, speedMult = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 4 + 2) * speedMult;
            splatters.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 5 + 2.5,
                alpha: 1,
                decay: Math.random() * 0.02 + 0.015,
                color: state.slimeColor
            });
        }
        addSlimeXp(count);
    }

    // Update Slime XP & Rank
    const xpCounterDisplay = document.getElementById('slime-counter-val');
    const xpLabel = document.getElementById('slime-xp-label');
    const rankTitle = document.getElementById('rank-title');
    const levelBarFill = document.getElementById('level-bar-fill');

    const ranks = [
        { xp: 0, name: 'Slug Larva' },
        { xp: 50, name: 'Slug Cadet' },
        { xp: 200, name: 'Slime Specialist' },
        { xp: 500, name: 'Outland Raider' },
        { xp: 1200, name: 'Slug Captain' },
        { xp: 2500, name: 'Slime Overlord' }
    ];

    function addSlimeXp(amount) {
        state.totalSlimeXp += amount;
        if (xpCounterDisplay) xpCounterDisplay.textContent = state.totalSlimeXp.toLocaleString();
        if (xpLabel) xpLabel.textContent = `${state.totalSlimeXp} XP`;

        // Determine rank
        let currentRank = ranks[0].name;
        let nextXp = ranks[1].xp;
        let prevXp = 0;

        for (let i = 0; i < ranks.length; i++) {
            if (state.totalSlimeXp >= ranks[i].xp) {
                currentRank = ranks[i].name;
                prevXp = ranks[i].xp;
                nextXp = ranks[i + 1] ? ranks[i + 1].xp : ranks[i].xp * 2;
            }
        }

        if (rankTitle) rankTitle.textContent = currentRank;
        if (levelBarFill) {
            const progress = Math.min(100, Math.max(5, ((state.totalSlimeXp - prevXp) / (nextXp - prevXp)) * 100));
            levelBarFill.style.width = `${progress}%`;
        }
    }

    /* ==========================================================================
       3. Slug Companion Following Logic (Mouse + Touch)
       ========================================================================== */
    const slugEl = document.getElementById('slug-companion');
    const slugBubble = document.getElementById('slug-bubble');
    const pupilLeft = document.querySelector('.pupil-left');
    const pupilRight = document.querySelector('.pupil-right');

    const speechQuips = [
        "SLIME PIT! 🐌",
        "TWITCH.TV/MUGZYSLUGS",
        "ALBION RAID READY! ⚔️",
        "EBAY POWER SELLER! 📦",
        "MARGINS CALCULATED! 💰",
        "360 LOOP GOD! 🌀",
        "DARK TRAP BEATS 🎧",
        "SLUG ARMY RISE! 💚",
        "COZY 420 VIBES 🌿",
        "SQUISH! 💦",
        "JOIN THE CHAT! 📺"
    ];

    function showSlugBubble(text, duration = 2000) {
        if (!slugBubble) return;
        slugBubble.textContent = text || speechQuips[Math.floor(Math.random() * speechQuips.length)];
        slugBubble.classList.add('active');
        clearTimeout(slugBubble._timer);
        slugBubble._timer = setTimeout(() => {
            slugBubble.classList.remove('active');
        }, duration);
    }

    // Pointer & Touch Handlers
    function updateTargetPosition(clientX, clientY) {
        state.targetPos.x = clientX;
        state.targetPos.y = clientY;
    }

    window.addEventListener('mousemove', (e) => {
        updateTargetPosition(e.clientX, e.clientY);
        // Occasionally emit tiny slime dots
        if (Math.random() < 0.25) {
            addSlimeXp(1);
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            updateTargetPosition(touch.clientX, touch.clientY);
            createSlimeSplatter(touch.clientX, touch.clientY, 2, 0.5);
        }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            updateTargetPosition(touch.clientX, touch.clientY);
            createSlimeSplatter(touch.clientX, touch.clientY, 8, 0.8);
            playSynthSound('squish');
        }
    }, { passive: true });

    // Click anywhere to squish & splatter
    window.addEventListener('click', (e) => {
        // Avoid interfering with form inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }
        createSlimeSplatter(e.clientX, e.clientY, 14, 1.2);
        playSynthSound('squish');
        if (Math.random() < 0.3) {
            showSlugBubble();
        }
    });

    // Companion Toggle button
    const toggleCompanionBtn = document.getElementById('toggle-companion-btn');
    const companionStatusText = document.getElementById('companion-status-text');

    if (toggleCompanionBtn) {
        toggleCompanionBtn.addEventListener('click', () => {
            state.companionEnabled = !state.companionEnabled;
            if (state.companionEnabled) {
                slugEl.classList.remove('hidden');
                toggleCompanionBtn.querySelector('.btn-label').textContent = 'Slug: ON';
                if (companionStatusText) companionStatusText.textContent = 'Active';
                showSlugBubble('I AM BACK! 🐌');
            } else {
                slugEl.classList.add('hidden');
                toggleCompanionBtn.querySelector('.btn-label').textContent = 'Slug: OFF';
                if (companionStatusText) companionStatusText.textContent = 'Resting';
            }
        });
    }

    // Color Swatch pickers
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const newColor = swatch.getAttribute('data-color');
            state.slimeColor = newColor;
            state.slimeGlow = newColor;
            // Update slug glow filter
            const floodShadow = document.querySelector('#slugGlow feDropShadow');
            if (floodShadow) {
                floodShadow.setAttribute('flood-color', newColor);
            }
            showSlugBubble(`NEW COLOR! ✨`);
            playSynthSound('laser');
        });
    });

    // Feed Slug Handlers
    const feedSlugBtn = document.getElementById('feed-slug-btn');
    const feedChoices = document.querySelectorAll('.feed-choice-btn');

    function feedSlug(foodType = 'lettuce') {
        const foodEmojis = { lettuce: '🥬', slimeberry: '🫐', mushroom: '🍄' };
        const foodNames = { lettuce: 'Lettuce', slimeberry: 'Slime Berry', mushroom: 'Magic Shroom' };
        const emoji = foodEmojis[foodType] || '🥬';

        // Spawn a floating food item near the slug
        const dropX = Math.max(80, Math.min(window.innerWidth - 80, state.slugPos.x + (Math.random() - 0.5) * 260));
        const dropY = Math.max(80, Math.min(window.innerHeight - 80, state.slugPos.y + (Math.random() - 0.5) * 260));

        const foodEl = document.createElement('div');
        foodEl.textContent = emoji;
        foodEl.style.cssText = `
            position: fixed;
            left: ${dropX}px;
            top: ${dropY}px;
            font-size: 2.2rem;
            z-index: 9998;
            pointer-events: none;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: foodBounce 0.8s infinite alternate ease-in-out;
            filter: drop-shadow(0 0 10px #39ff14);
        `;
        document.body.appendChild(foodEl);

        // Direct slug toward the food
        state.targetPos.x = dropX;
        state.targetPos.y = dropY;
        showSlugBubble(`OOH ${emoji}!`);

        // Check when slug arrives
        const eatInterval = setInterval(() => {
            const dist = Math.hypot(state.slugPos.x - dropX, state.slugPos.y - dropY);
            if (dist < 40) {
                clearInterval(eatInterval);
                createSlimeSplatter(dropX, dropY, 16, 1.3);
                playSynthSound('squish');
                showSlugBubble(`YUMMY ${foodNames[foodType]}! +100 XP`, 2500);
                addSlimeXp(100);
                foodEl.style.transform = 'scale(0)';
                setTimeout(() => foodEl.remove(), 400);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(eatInterval);
            if (foodEl.parentNode) foodEl.remove();
        }, 8000);
    }

    if (feedSlugBtn) {
        feedSlugBtn.addEventListener('click', () => feedSlug('lettuce'));
    }
    feedChoices.forEach(btn => {
        btn.addEventListener('click', () => {
            feedSlug(btn.getAttribute('data-food'));
        });
    });

    /* ==========================================================================
       4. 60 FPS Main Animation Loop (Slug & Slime Trail)
       ========================================================================== */
    function renderLoop() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // 1. Update & Render Splatters
        for (let i = splatters.length - 1; i >= 0; i--) {
            const s = splatters[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.94;
            s.vy *= 0.94;
            s.alpha -= s.decay;

            if (s.alpha <= 0) {
                splatters.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.shadowBlur = 10;
            ctx.shadowColor = s.color;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(0.5, s.radius * s.alpha), 0, Math.PI * 2);
            ctx.fill();

            // Inner specular white shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(s.x - s.radius * 0.2, s.y - s.radius * 0.2, Math.max(0.2, s.radius * 0.3 * s.alpha), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 2. Slug Physics (Lerp towards target)
        const dx = state.targetPos.x - state.slugPos.x;
        const dy = state.targetPos.y - state.slugPos.y;
        const dist = Math.hypot(dx, dy);

        // Natural slug speed with damping
        const speed = Math.min(dist * 0.045, 7.5);

        if (dist > 8) {
            state.isCrawling = true;
            const targetAngle = Math.atan2(dy, dx);
            
            // Smooth angle interpolation
            let angleDiff = targetAngle - state.slugAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            state.slugAngle += angleDiff * 0.12;

            state.slugPos.x += Math.cos(state.slugAngle) * speed;
            state.slugPos.y += Math.sin(state.slugAngle) * speed;

            state.walkCycle += speed * 0.08;

            // Tail emits slime trail point
            const tailOffsetX = Math.cos(state.slugAngle + Math.PI) * 28;
            const tailOffsetY = Math.sin(state.slugAngle + Math.PI) * 28;
            trailPoints.push({
                x: state.slugPos.x + tailOffsetX,
                y: state.slugPos.y + tailOffsetY,
                age: 0,
                color: state.slimeColor
            });

            // Occasional tiny slime droplets
            if (Math.random() < 0.18) {
                splatters.push({
                    x: state.slugPos.x + tailOffsetX + (Math.random() - 0.5) * 6,
                    y: state.slugPos.y + tailOffsetY + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    radius: Math.random() * 3 + 1.5,
                    alpha: 0.8,
                    decay: 0.02,
                    color: state.slimeColor
                });
            }
        } else {
            state.isCrawling = false;
            state.walkCycle += 0.03; // Idle breathing
        }

        // 3. Render Slime Trail on Canvas
        // Age and prune trail points
        for (let i = trailPoints.length - 1; i >= 0; i--) {
            trailPoints[i].age += 0.85;
            if (trailPoints[i].age > maxTrailPoints) {
                trailPoints.splice(i, 1);
            }
        }

        if (trailPoints.length > 2) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glowing slime ribbon
            ctx.beginPath();
            ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
            for (let i = 1; i < trailPoints.length - 1; i++) {
                const xc = (trailPoints[i].x + trailPoints[i + 1].x) / 2;
                const yc = (trailPoints[i].y + trailPoints[i + 1].y) / 2;
                ctx.quadraticCurveTo(trailPoints[i].x, trailPoints[i].y, xc, yc);
            }

            ctx.shadowBlur = 12;
            ctx.shadowColor = state.slimeColor;
            ctx.strokeStyle = state.slimeColor.replace(')', ', 0.55)').replace('rgb', 'rgba').replace('#39ff14', 'rgba(57, 255, 20, 0.5)');
            ctx.lineWidth = baseTrailWidth;
            ctx.stroke();

            // Inner core glossy highlight
            ctx.beginPath();
            ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
            for (let i = 1; i < trailPoints.length - 1; i++) {
                const xc = (trailPoints[i].x + trailPoints[i + 1].x) / 2;
                const yc = (trailPoints[i].y + trailPoints[i + 1].y) / 2;
                ctx.quadraticCurveTo(trailPoints[i].x, trailPoints[i].y, xc, yc);
            }
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#ffffff';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = baseTrailWidth * 0.35;
            ctx.stroke();
            ctx.restore();
        }

        // 4. Update Slug Companion DOM Transform
        if (slugEl && state.companionEnabled) {
            // Locomotion squashing and stretching
            const stretch = state.isCrawling ? 1 + 0.16 * Math.sin(state.walkCycle) : 1 + 0.04 * Math.sin(state.walkCycle);
            const squash = state.isCrawling ? 1 - 0.14 * Math.sin(state.walkCycle) : 1 - 0.04 * Math.sin(state.walkCycle);

            const deg = (state.slugAngle * 180) / Math.PI;

            slugEl.style.transform = `translate3d(${state.slugPos.x - 42}px, ${state.slugPos.y - 25}px, 0) rotate(${deg}deg) scale(${stretch}, ${squash})`;

            if (state.isCrawling) {
                slugEl.classList.add('crawling');
            } else {
                slugEl.classList.remove('crawling');
            }

            // Eyeball direction toward target
            if (pupilLeft && pupilRight) {
                const lookDist = Math.min(2.5, dist * 0.05);
                const lookAngle = Math.atan2(dy, dx) - state.slugAngle;
                const px = Math.cos(lookAngle) * lookDist;
                const py = Math.sin(lookAngle) * lookDist;
                pupilLeft.setAttribute('cx', 95 + px);
                pupilLeft.setAttribute('cy', 13 + py);
                pupilRight.setAttribute('cx', 109 + px);
                pupilRight.setAttribute('cy', 16 + py);
            }
        }

        requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);


    /* ==========================================================================
       5. Web Audio Synthesizer (Emo Rap & Dark Trap Engine)
       ========================================================================== */
    const playlist = [
        {
            title: "NUMBIN",
            genre: "Lil Peep x MugzySlugs Type Dark Emo Trap",
            duration: "2:45",
            durationSec: 165,
            bpm: 135,
            bassNote: 36.71, // D1
            leadNotes: [220, 261.63, 293.66, 349.23, 329.63] // D minor emo lead
        },
        {
            title: "Social Suicide",
            genre: "Melancholic Dark Trap Original",
            duration: "3:12",
            durationSec: 192,
            bpm: 140,
            bassNote: 32.70, // C1
            leadNotes: [196, 233.08, 261.63, 311.13, 293.66] // C minor trap
        },
        {
            title: "Moving Too Fast",
            genre: "Emotional Rap (feat. Mad_Ghost)",
            duration: "2:58",
            durationSec: 178,
            bpm: 128,
            bassNote: 41.20, // E1
            leadNotes: [246.94, 293.66, 329.63, 392.00, 369.99] // E minor emo
        },
        {
            title: "Tokyo Drift",
            genre: "Dark Trap Love Song",
            duration: "3:30",
            durationSec: 210,
            bpm: 145,
            bassNote: 38.89, // Eb1
            leadNotes: [233.08, 277.18, 311.13, 369.99, 349.23] // Eb cyberpunk
        },
        {
            title: "Silent Love",
            genre: "Atmospheric Emo Lo-Fi",
            duration: "2:36",
            durationSec: 156,
            bpm: 120,
            bassNote: 43.65, // F1
            leadNotes: [261.63, 329.63, 392.00, 440.00, 392.00] // F major lo-fi
        }
    ];

    let currentTrackIdx = 0;
    let isPlayingMusic = false;
    let trackProgressSec = 0;
    let synthTimer = null;
    let beatTimer = null;
    let stepCount = 0;

    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currTimeLabel = document.getElementById('curr-time');
    const totalTimeLabel = document.getElementById('total-time');
    const progressFill = document.getElementById('progress-fill');
    const progressBg = document.getElementById('progress-bg');
    const currentTitle = document.getElementById('current-title');
    const currentGenre = document.getElementById('current-genre');
    const volumeSlider = document.getElementById('volume-slider');
    const synthPlayerCard = document.querySelector('.synth-player-card');
    const trackRows = document.querySelectorAll('.track-row');

    // Master synth gain
    let masterGain = null;
    function getMasterGain() {
        const ctx = getAudioContext();
        if (!masterGain && ctx) {
            masterGain = ctx.createGain();
            masterGain.gain.value = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;
            masterGain.connect(ctx.destination);
        }
        return masterGain;
    }

    // Play a synthesized musical beat step
    function triggerBeatStep() {
        const ctx = getAudioContext();
        if (!ctx || !isPlayingMusic) return;

        const track = playlist[currentTrackIdx];
        const now = ctx.currentTime;
        const mg = getMasterGain();

        // Step sequencing (16-step bar)
        const step = stepCount % 16;
        stepCount++;

        // 1. Kick on 0, 4, 8, 12 with 808 glide on 0 & 8
        if (step === 0 || step === 8 || step === 10) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(140, now);
            kickOsc.frequency.exponentialRampToValueAtTime(track.bassNote, now + 0.12);

            kickGain.gain.setValueAtTime(0.8, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            kickOsc.connect(kickGain);
            kickGain.connect(mg);
            kickOsc.start(now);
            kickOsc.stop(now + 0.46);
        }

        // 2. Snare / Clap on 4 and 12
        if (step === 4 || step === 12) {
            // White noise burst for snare
            const bufferSize = ctx.sampleRate * 0.15;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            whiteNoise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(mg);
            whiteNoise.start(now);
        }

        // 3. Hi-Hat roll on every even step (and 16th triplets on step 14)
        if (step % 2 === 0 || step === 14 || step === 15) {
            const hatOsc = ctx.createOscillator();
            const hatGain = ctx.createGain();
            hatOsc.type = 'triangle';
            hatOsc.frequency.setValueAtTime(7500, now);

            hatGain.gain.setValueAtTime(0.25, now);
            hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            hatOsc.connect(hatGain);
            hatGain.connect(mg);
            hatOsc.start(now);
            hatOsc.stop(now + 0.06);
        }

        // 4. Melancholic Lead / Guitar Melody notes
        if (step % 4 === 0 || step === 6 || step === 14) {
            const leadFreq = track.leadNotes[Math.floor(Math.random() * track.leadNotes.length)];
            const leadOsc = ctx.createOscillator();
            const leadFilter = ctx.createBiquadFilter();
            const leadGain = ctx.createGain();

            leadOsc.type = (step % 8 === 0) ? 'sawtooth' : 'triangle';
            leadOsc.frequency.setValueAtTime(leadFreq, now);

            leadFilter.type = 'lowpass';
            leadFilter.frequency.setValueAtTime(1400, now);
            leadFilter.frequency.exponentialRampToValueAtTime(400, now + 0.5);

            leadGain.gain.setValueAtTime(0.28, now);
            leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            leadOsc.connect(leadFilter);
            leadFilter.connect(leadGain);
            leadGain.connect(mg);
            leadOsc.start(now);
            leadOsc.stop(now + 0.62);
        }
    }

    function startMusicEngine() {
        const track = playlist[currentTrackIdx];
        const stepIntervalMs = (60 / track.bpm / 4) * 1000;

        clearInterval(beatTimer);
        beatTimer = setInterval(triggerBeatStep, stepIntervalMs);

        clearInterval(synthTimer);
        synthTimer = setInterval(() => {
            trackProgressSec++;
            if (trackProgressSec >= track.durationSec) {
                nextTrack();
            } else {
                updateProgressUI();
            }
        }, 1000);
    }

    function stopMusicEngine() {
        clearInterval(beatTimer);
        clearInterval(synthTimer);
    }

    function updateProgressUI() {
        const track = playlist[currentTrackIdx];
        const pct = (trackProgressSec / track.durationSec) * 100;
        if (progressFill) progressFill.style.width = `${pct}%`;

        const m = Math.floor(trackProgressSec / 60);
        const s = trackProgressSec % 60;
        if (currTimeLabel) currTimeLabel.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function loadTrack(idx) {
        currentTrackIdx = (idx + playlist.length) % playlist.length;
        const track = playlist[currentTrackIdx];

        if (currentTitle) currentTitle.textContent = track.title;
        if (currentGenre) currentGenre.textContent = track.genre;
        if (totalTimeLabel) totalTimeLabel.textContent = track.duration;

        trackProgressSec = 0;
        updateProgressUI();

        trackRows.forEach((r, i) => {
            r.classList.toggle('active', i === currentTrackIdx);
            r.classList.toggle('is-playing', i === currentTrackIdx && isPlayingMusic);
        });

        if (isPlayingMusic) {
            stopMusicEngine();
            startMusicEngine();
        }
    }

    function togglePlayMusic() {
        getAudioContext();
        isPlayingMusic = !isPlayingMusic;

        if (isPlayingMusic) {
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            synthPlayerCard.classList.add('is-playing');
            startMusicEngine();
            trackRows[currentTrackIdx].classList.add('is-playing');
            showSlugBubble("🎶 BEATS PLAYING!");
        } else {
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            synthPlayerCard.classList.remove('is-playing');
            stopMusicEngine();
            trackRows.forEach(r => r.classList.remove('is-playing'));
        }
    }

    function nextTrack() {
        loadTrack(currentTrackIdx + 1);
    }

    function prevTrack() {
        loadTrack(currentTrackIdx - 1);
    }

    if (playBtn) playBtn.addEventListener('click', togglePlayMusic);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);

    trackRows.forEach((row, i) => {
        row.addEventListener('click', () => {
            if (currentTrackIdx === i) {
                togglePlayMusic();
            } else {
                loadTrack(i);
                if (!isPlayingMusic) togglePlayMusic();
            }
        });
    });

    // Timeline seeking
    if (progressBg) {
        progressBg.addEventListener('click', (e) => {
            const rect = progressBg.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            trackProgressSec = Math.floor(clickPos * playlist[currentTrackIdx].durationSec);
            updateProgressUI();
        });
    }

    // Volume Slider
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const mg = getMasterGain();
            if (mg) mg.gain.value = val;
        });
    }


    /* ==========================================================================
       6. Soundboard Synthesized FX
       ========================================================================== */
    function playSynthSound(soundType) {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const mg = getMasterGain();

        switch (soundType) {
            case 'squish': {
                // Juicy bubble modulation
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

                osc.connect(gain);
                gain.connect(mg);
                osc.start(now);
                osc.stop(now + 0.17);
                break;
            }
            case 'alert': {
                // Twitch Sub Arpeggio
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;

                    const t = now + i * 0.08;
                    gain.gain.setValueAtTime(0.35, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                    osc.connect(gain);
                    gain.connect(mg);
                    osc.start(t);
                    osc.stop(t + 0.26);
                });
                break;
            }
            case 'sub808': {
                // Deep pitch envelope 808
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(36, now + 0.2);

                gain.gain.setValueAtTime(0.9, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

                osc.connect(gain);
                gain.connect(mg);
                osc.start(now);
                osc.stop(now + 1.25);
                break;
            }
            case 'battle': {
                // Albion War Horn (brass saw blast)
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc1.type = 'sawtooth';
                osc2.type = 'sawtooth';
                osc1.frequency.setValueAtTime(110, now);
                osc2.frequency.setValueAtTime(112, now); // Detuned

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.linearRampToValueAtTime(1800, now + 0.3);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.9);

                gain.gain.setValueAtTime(0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

                osc1.connect(filter);
                osc2.connect(filter);
                filter.connect(gain);
                gain.connect(mg);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 1.05);
                osc2.stop(now + 1.05);
                break;
            }
            case 'laser': {
                // Cyber Synth pitch drop
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1800, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

                osc.connect(gain);
                gain.connect(mg);
                osc.start(now);
                osc.stop(now + 0.33);
                break;
            }
            case 'hype': {
                // Hype Train Whistle
                [880, 1174.66].forEach(freq => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.linearRampToValueAtTime(freq + 40, now + 0.4);

                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                    osc.connect(gain);
                    gain.connect(mg);
                    osc.start(now);
                    osc.stop(now + 0.65);
                });
                break;
            }
        }
    }

    const soundPads = document.querySelectorAll('.sound-pad');
    soundPads.forEach(pad => {
        pad.addEventListener('click', () => {
            const soundType = pad.getAttribute('data-sound');
            playSynthSound(soundType);
            pad.style.transform = 'scale(0.92)';
            setTimeout(() => { pad.style.transform = ''; }, 150);
            createSlimeSplatter(pad.getBoundingClientRect().left + 40, pad.getBoundingClientRect().top + 30, 8, 0.7);
        });
    });


    /* ==========================================================================
       7. Interactive Twitch Live Stage & Chat Simulator
       ========================================================================== */
    const toggleEmbedBtn = document.getElementById('toggle-twitch-embed-btn');
    const loadEmbedNowBtn = document.getElementById('load-embed-now-btn');
    const stagePlaceholder = document.getElementById('stage-placeholder');
    const twitchEmbedContainer = document.getElementById('twitch-embed-container');
    let isEmbedLoaded = false;

    function loadOfficialTwitchEmbed() {
        if (isEmbedLoaded) {
            // Revert back to interactive stage
            stagePlaceholder.style.display = 'flex';
            twitchEmbedContainer.style.display = 'none';
            twitchEmbedContainer.innerHTML = '';
            toggleEmbedBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Load Official Twitch Embed';
            isEmbedLoaded = false;
        } else {
            stagePlaceholder.style.display = 'none';
            twitchEmbedContainer.style.display = 'block';

            // Detect current hostname for Twitch parent security policy
            const currentHost = window.location.hostname || 'localhost';
            const parentList = ['www.mugzyslugs.com', 'mugzyslugs.com', 'localhost', currentHost];
            const parentParam = parentList.map(h => `parent=${encodeURIComponent(h)}`).join('&');

            twitchEmbedContainer.innerHTML = `
                <iframe
                    src="https://player.twitch.tv/?channel=mugzyslugs&${parentParam}&autoplay=true&muted=true"
                    allowfullscreen="true"
                    scrolling="no"
                    height="100%"
                    width="100%">
                </iframe>
            `;
            toggleEmbedBtn.innerHTML = '<i class="fa-solid fa-tv"></i> Switch to Stage Mode';
            isEmbedLoaded = true;
        }
    }

    if (toggleEmbedBtn) toggleEmbedBtn.addEventListener('click', loadOfficialTwitchEmbed);
    if (loadEmbedNowBtn) loadEmbedNowBtn.addEventListener('click', loadOfficialTwitchEmbed);

    // Hype Train Trigger
    const hypeTrainBtn = document.getElementById('hype-train-btn');
    if (hypeTrainBtn) {
        hypeTrainBtn.addEventListener('click', () => {
            playSynthSound('hype');
            showSlugBubble("🚂 HYPE TRAIN LEVEL 5!", 3000);
            // Splatter all around
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    createSlimeSplatter(
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight * 0.7 + 100,
                        18,
                        1.5
                    );
                }, i * 140);
            }
            appendChatRow('TwitchAlerts', 'mod', '🚂 HYPE TRAIN STARTED! ALL ABOARD THE SLUG EXPRESS!');
        });
    }

    // Twitch Chat Simulation
    const chatStream = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-user-input');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const quickChips = document.querySelectorAll('.pill-chip');

    const chatBotPool = [
        { name: 'SlimeSlinger', role: 'sub' },
        { name: 'AlbionCrafter99', role: 'viewer' },
        { name: 'FogLooper_x', role: 'vip' },
        { name: 'Mod_Muggzy', role: 'mod' },
        { name: 'MugzySlugs', role: 'streamer' },
        { name: 'DarkTrapEnjoyer', role: 'sub' },
        { name: 'ToxicNea_Juke', role: 'viewer' },
        { name: 'ChillBeatsOnly', role: 'vip' }
    ];

    const randomChatMsgs = [
        "Let's goooo! The Black Zone caravan is rolling!",
        "Mugzy that flashlight blind was ridiculous haha",
        "NUMBIN is an absolute masterpiece on God",
        "Slug Army in full force tonight! 🐌💚",
        "That shipping margin calculation was so clean!",
        "Yo that vintage stereo receiver flip was crazy profit!",
        "Dropshipping and marketplace margins dialed in 📦✨",
        "Is DBD viewer lobby next? I'm queuing up",
        "That loop pathing had the killer lost in the cornfield",
        "Don't forget to drop your prime subs on twitch.tv/mugzyslugs guys!",
        "What FL Studio plugins are you using for that guitar melody?",
        "420 friendly cozy stream is exactly what I needed after work",
        "eBay power seller by day, Albion warlord by night!",
        "PVP gank squad incoming watch your 6!",
        "The slime trail on this website is so cool haha"
    ];

    function appendChatRow(username, role, text) {
        if (!chatStream) return;
        const row = document.createElement('div');
        row.className = 'chat-row';

        let badgeHtml = '';
        if (role === 'streamer') badgeHtml = '<span class="chat-badge badge-streamer"><i class="fa-solid fa-crown"></i></span>';
        else if (role === 'mod') badgeHtml = '<span class="chat-badge badge-mod"><i class="fa-solid fa-shield"></i></span>';
        else if (role === 'vip') badgeHtml = '<span class="chat-badge badge-vip"><i class="fa-solid fa-gem"></i></span>';
        else if (role === 'sub') badgeHtml = '<span class="chat-badge badge-sub"><i class="fa-solid fa-star"></i></span>';

        row.innerHTML = `
            ${badgeHtml}
            <span class="chat-user user-${role}">${username}:</span>
            <span class="chat-text">${escapeHtml(text)}</span>
        `;

        chatStream.appendChild(row);
        chatStream.scrollTop = chatStream.scrollHeight;

        if (chatStream.children.length > 50) {
            chatStream.removeChild(chatStream.firstChild);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Seed initial messages
    for (let i = 0; i < 4; i++) {
        const bot = chatBotPool[Math.floor(Math.random() * chatBotPool.length)];
        const msg = randomChatMsgs[Math.floor(Math.random() * randomChatMsgs.length)];
        appendChatRow(bot.name, bot.role, msg);
    }

    // Periodic organic chat updates
    setInterval(() => {
        if (Math.random() < 0.65) {
            const bot = chatBotPool[Math.floor(Math.random() * chatBotPool.length)];
            const msg = randomChatMsgs[Math.floor(Math.random() * randomChatMsgs.length)];
            appendChatRow(bot.name, bot.role, msg);
        }
    }, 4800);

    // Form user submission
    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            appendChatRow('You', 'vip', text);
            chatInput.value = '';

            // Interactive bot reaction
            setTimeout(() => {
                const replies = [
                    "Big facts! Welcome to the Slug Pit! 🐌",
                    "Welcome in! Follow the channel if you're enjoying the stream!",
                    "Check out twitch.tv/mugzyslugs for the live stream!",
                    "Slug army represent! 💚",
                    "Albion caravan or marketplace flip breakdown next? Let Mugzy know!",
                    "True margins calculated! Welcome to the family!"
                ];
                const reply = replies[Math.floor(Math.random() * replies.length)];
                appendChatRow('MugzySlugs', 'streamer', reply);
            }, 1200);
        });
    }

    // Quick emote chips
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const msg = chip.getAttribute('data-msg');
            appendChatRow('You', 'vip', msg);
            playSynthSound('squish');
        });
    });

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (chatStream) chatStream.innerHTML = '';
        });
    }

    // Mobile nav toggle
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mainNav = document.getElementById('main-nav');
    if (mobileNavToggle && mainNav) {
        mobileNavToggle.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-active');
        });
    }

    // Active nav scroll spy
    const navSections = document.querySelectorAll('section');
    const headerNavLinks = document.querySelectorAll('.main-nav .nav-link');

    window.addEventListener('scroll', () => {
        let currentId = '';
        const scrollY = window.pageYOffset;

        navSections.forEach(section => {
            const top = section.offsetTop - 140;
            const height = section.offsetHeight;
            if (scrollY >= top && scrollY < top + height) {
                currentId = section.getAttribute('id');
            }
        });

        headerNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentId}`) {
                link.classList.add('active');
            }
        });
    });

    console.log("🐌 MugzySlugs Slug Pit Engine initialized! Directing to twitch.tv/mugzyslugs");
});
