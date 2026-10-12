const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const stems = ['bass.wav', 'drums.wav', 'vocals.wav', 'other.wav'];
let buffers = [], analyzers = [], gainNodes = [], sourceNodes = [];
let currentTrackName = "";
let isPlaying = false, startTime = 0, pausedAt = 0, duration = 0, progressInterval;

// --- PYTHON API INTEGRATION & UI LOGIC ---
window.addEventListener('pywebviewready', function() {
    
    async function handleUpload() {
        const filePath = await window.pywebview.api.pick_file();
        if (!filePath) return;

        if (isPlaying) pauseAudio();
        sourceNodes.forEach(source => source.disconnect());
        sourceNodes = [];
        pausedAt = 0;
        document.getElementById('timeline').value = 0;

        document.getElementById('splash-screen').style.display = 'flex';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('mixer').style.display = 'none';
        document.getElementById('uploadBtnHero').style.display = 'none';
        document.getElementById('folderBtnHero').style.display = 'none';
        
        document.getElementById('progress-container').style.display = 'block';
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('statusText').innerText = "AI SPLITTING IN PROGRESS (1-2 MIN)...";
        
        let currentProgress = 0;
        progressInterval = setInterval(() => {
            if (currentProgress < 90) {
                currentProgress += 1;
                document.getElementById('progress-bar').style.width = currentProgress + '%';
            }
        }, 800);

        currentTrackName = await window.pywebview.api.process_audio(filePath);
        
        clearInterval(progressInterval);
        document.getElementById('progress-bar').style.width = '100%';
        document.getElementById('statusText').innerText = "LOADING STEMS TO ENGINE...";
        
        setTimeout(async () => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('top-bar').style.display = 'block';
            await loadAudio(currentTrackName);
        }, 500);
    }

    document.getElementById('uploadBtnHero').addEventListener('click', handleUpload);
    document.getElementById('uploadBtnSmall').addEventListener('click', handleUpload);

    document.getElementById('folderBtn').addEventListener('click', () => {
        window.pywebview.api.open_stems_folder(currentTrackName);
    });

    document.getElementById('folderBtnHero').addEventListener('click', () => {
        window.pywebview.api.open_stems_folder("");
    });
});

// --- AUDIO ENGINE ---
async function loadAudio(trackName) {
    buffers = []; analyzers = []; gainNodes = [];
    
    for (let i = 0; i < stems.length; i++) {
        const response = await fetch(`stems/${encodeURIComponent(trackName)}/${stems[i]}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        buffers.push(audioBuffer);

        const gainNode = audioCtx.createGain(); 
        gainNode.gain.value = document.getElementById(`vol-${i}`).value;
        const analyzer = audioCtx.createAnalyser(); 
        analyzer.fftSize = 256;
        
        gainNodes.push(gainNode); analyzers.push(analyzer);
        document.getElementById(`vol-${i}`).addEventListener('input', (e) => gainNode.gain.value = e.target.value);
    }

    duration = buffers[0].duration;
    document.getElementById('timeline').max = duration;
    document.getElementById('mixer').style.display = 'block';
    
    playAudio(0);
    drawVisualizer();
}

function playAudio(offset) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    sourceNodes.forEach(source => source.disconnect());
    sourceNodes = [];

    buffers.forEach((buffer, index) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNodes[index]);
        gainNodes[index].connect(analyzers[index]);
        analyzers[index].connect(audioCtx.destination);
        source.start(0, offset);
        sourceNodes.push(source);
    });

    startTime = audioCtx.currentTime - offset;
    pausedAt = offset;
    isPlaying = true;
    document.getElementById('playPauseBtn').innerText = "PAUSE";
}

function pauseAudio() {
    sourceNodes.forEach(source => source.stop());
    pausedAt = audioCtx.currentTime - startTime;
    isPlaying = false;
    document.getElementById('playPauseBtn').innerText = "PLAY";
}

document.getElementById('playPauseBtn').addEventListener('click', () => {
    isPlaying ? pauseAudio() : playAudio(pausedAt);
});

document.getElementById('timeline').addEventListener('input', (e) => {
    pausedAt = parseFloat(e.target.value);
    if (isPlaying) playAudio(pausedAt);
});

setInterval(() => {
    if (isPlaying) {
        const currentPlaybackTime = audioCtx.currentTime - startTime;
        document.getElementById('timeline').value = currentPlaybackTime;
    }
}, 100);

// --- 3D VISUALIZER ENGINE (THREE.JS) ---
const canvas = document.getElementById('visualizer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Utility for Eclipse Canyon Glow
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const glowTex = createGlowTexture();

// --- PRESET 1: DUAL-CORE HYPER-TUNNEL ---
const HyperTunnelPreset = {
    group: new THREE.Group(),
    cameraConfig: { fov: 75, pos: [0, 0, 93], lookAt: [0, 0, 0], fog: null },
    
    init(scene) {
        const innerGeo = new THREE.IcosahedronGeometry(9, 1);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x38024f, wireframe: false }); 
        this.innerCore = new THREE.Mesh(innerGeo, innerMat);
        this.group.add(this.innerCore);

        const outerGeo = new THREE.IcosahedronGeometry(15, 2);
        const outerMat = new THREE.MeshBasicMaterial({ color: 0x20e87f, wireframe: true }); 
        this.outerShell = new THREE.Mesh(outerGeo, outerMat);
        this.group.add(this.outerShell);

        this.particleCount = 1000;
        const particleGeo = new THREE.BufferGeometry();
        this.posArray = new Float32Array(this.particleCount * 3);
        for(let i = 0; i < this.particleCount; i++) {
            const radius = 30 + Math.random() * 120;
            const angle = Math.random() * Math.PI * 2;
            this.posArray[i * 3] = Math.cos(angle) * radius; 
            this.posArray[i * 3 + 1] = Math.sin(angle) * radius;
            this.posArray[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
        const particleMat = new THREE.PointsMaterial({
            size: 0.6, color: 0xffffff, transparent: true, opacity: 0.8
        });
        this.particlesMesh = new THREE.Points(particleGeo, particleMat);
        this.group.add(this.particlesMesh);
        
        scene.add(this.group);
    },

    update(stems, now) {
        const scale = 1 + (stems.bass * 0.013);
        this.innerCore.scale.set(scale, scale, scale);
        this.outerShell.scale.set(scale, scale, scale);

        const hue = (280 - (stems.vocals * 0.8)) / 360; 
        this.outerShell.material.color.setHSL(hue, 1.0, 0.6);

        this.innerCore.rotation.x += 0.01 + (stems.melody * 0.0002);
        this.innerCore.rotation.y += 0.01 + (stems.melody * 0.0002);
        this.outerShell.rotation.x -= 0.005 + (stems.melody * 0.0005);
        this.outerShell.rotation.y -= 0.005 + (stems.melody * 0.0005);
        this.particlesMesh.rotation.z += 0.002 + (stems.melody * 0.0001);

        const positions = this.particlesMesh.geometry.attributes.position.array;
        for(let i = 2; i < this.particleCount * 3; i += 3) {
            positions[i] += 0.3 + (stems.drums * 0.04); 
            if(positions[i] > 50) positions[i] = -150; 
        }
        this.particlesMesh.geometry.attributes.position.needsUpdate = true;
    },

    setActive(active) { this.group.visible = active; }
};

// --- PRESET 2: ECLIPSE CANYON ---
const EclipseCanyonPreset = {
    group: new THREE.Group(),
    cameraConfig: { fov: 60, pos: [0, 12, 60], lookAt: [0, 15, -50], fog: new THREE.FogExp2(0x010103, 0.0065) },
    scrollZ: 0,
    
    init(scene) {
        this.gridW = 350; this.gridH = 350;
        this.cols = 160; this.rows = 180;
        this.particleCount = this.cols * this.rows;

        this.gridGeo = new THREE.BufferGeometry();
        this.posArray = new Float32Array(this.particleCount * 3);
        this.origArray = new Float32Array(this.particleCount * 3);

        let idx = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = (c / this.cols) * this.gridW - (this.gridW / 2);
                const z = (r / this.rows) * this.gridH - (this.gridH / 2);
                this.posArray[idx] = x; this.posArray[idx + 1] = 0; this.posArray[idx + 2] = z;
                this.origArray[idx] = x; this.origArray[idx + 1] = 0; this.origArray[idx + 2] = z;
                idx += 3;
            }
        }
        this.gridGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
        this.gridMat = new THREE.PointsMaterial({
            size: 1.4, color: 0x00e5ff, map: glowTex,
            transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.gridMesh = new THREE.Points(this.gridGeo, this.gridMat);
        this.gridMesh.position.y = -8;
        this.group.add(this.gridMesh);

        const voidGeo = new THREE.SphereGeometry(24, 32, 32);
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.blackHole = new THREE.Mesh(voidGeo, voidMat);
        this.blackHole.position.set(0, 35, -160);
        this.group.add(this.blackHole);

        this.diskGroup = new THREE.Group();
        this.diskGroup.position.set(0, 35, -160);
        this.diskGroup.rotation.x = 0.3;
        this.diskGroup.rotation.z = -0.15;
        this.group.add(this.diskGroup);

        this.diskCount = 8000;
        this.diskGeo = new THREE.BufferGeometry();
        this.diskPos = new Float32Array(this.diskCount * 3);
        this.diskOrig = new Float32Array(this.diskCount * 3);

        for (let j = 0; j < this.diskCount; j++) {
            const radius = 25 + Math.random() * 25;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 1.5;
            this.diskPos[j * 3] = x; this.diskPos[j * 3 + 1] = y; this.diskPos[j * 3 + 2] = z;
            this.diskOrig[j * 3] = x; this.diskOrig[j * 3 + 1] = y; this.diskOrig[j * 3 + 2] = z;
        }
        this.diskGeo.setAttribute('position', new THREE.BufferAttribute(this.diskPos, 3));
        this.diskMat = new THREE.PointsMaterial({
            size: 1.5, color: 0xffaa00, map: glowTex,
            transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.diskMesh = new THREE.Points(this.diskGeo, this.diskMat);
        this.diskGroup.add(this.diskMesh);

        this.sentinelGroup = new THREE.Group();
        this.sentinelGroup.position.set(0, 35, -190);
        this.group.add(this.sentinelGroup);

        const ringMatSolid = new THREE.MeshBasicMaterial({
            color: 0x00e5ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending
        });
        this.outerRing = new THREE.Mesh(new THREE.TorusGeometry(90, 1.5, 16, 120), ringMatSolid);
        this.innerRing = new THREE.Mesh(new THREE.TorusGeometry(70, 1.0, 16, 100), ringMatSolid.clone());
        this.sentinelGroup.add(this.outerRing);
        this.sentinelGroup.add(this.innerRing);

        const ringMatWire = new THREE.MeshBasicMaterial({
            color: 0x00ffaa, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, wireframe: true
        });
        this.dataRing = new THREE.Mesh(new THREE.TorusGeometry(80, 6, 4, 80), ringMatWire);
        this.sentinelGroup.add(this.dataRing);

        scene.add(this.group);
    },

    update(stems, now) {
        const b = stems.bass / 255;
        const d = stems.drums / 255;
        const v = stems.vocals / 255;
        const m = stems.melody / 255;

        this.outerRing.scale.set(1 + (d * 0.2), 1 + (d * 0.05), 1);
        this.innerRing.scale.set(1 - (d * 0.1), 1 - (d * 0.05), 1);
        this.dataRing.scale.set(1 + (d * 0.02), 1 + (d * 0.02), 1 + (d * 0.6));
        this.dataRing.rotation.z += 0.001 + (d * 0.015);

        const drumFlash = 0.20 + (d * 0.95);
        this.outerRing.material.opacity = drumFlash;
        this.innerRing.material.opacity = drumFlash;
        this.dataRing.material.opacity = drumFlash * 0.7;

        const ringLightness = 0.4 + (d * 0.6);
        this.outerRing.material.color.setHSL(0.5, 1.0, ringLightness);
        this.innerRing.material.color.setHSL(0.5, 1.0, ringLightness);
        this.dataRing.material.color.setHSL(0.48, 1.0, ringLightness);

        this.scrollZ += (0.6 + (m * 1.4)); // Scroll speed influenced by melody
        const positions = this.gridGeo.attributes.position.array; 
        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;
            const origX = this.origArray[idx];
            const origZ = this.origArray[idx + 2];
            let activeZ = ((origZ + this.scrollZ + (this.gridH / 2)) % this.gridH) - (this.gridH / 2);

            const valleyFactor = Math.pow(Math.abs(origX) / (this.gridW * 0.32), 3);
            const jaggedNoise = Math.abs(Math.sin(origX * 0.15 + now * 4)) * Math.abs(Math.cos(activeZ * 0.1 - now * 6));
            
            positions[idx] = origX;
            positions[idx + 1] = (b * 90) * valleyFactor * jaggedNoise; // Height influenced by bass, valley shape, and noise
            positions[idx + 2] = activeZ;
        }
        this.gridGeo.attributes.position.needsUpdate = true;
        this.gridMat.color.setHSL((230 + (m * 160)) / 360, 0.9, 0.5 + (b * 0.2));

        const cPos = this.diskGeo.attributes.position.array;
        for (let i = 0; i < this.diskCount; i++) {
            const idx = i * 3;
            const ox = this.diskOrig[idx];
            const oz = this.diskOrig[idx + 2];
            const dist = Math.sqrt(ox * ox + oz * oz);
            const flare = Math.sin(ox * 0.5 + now * 10) * Math.cos(oz * 0.5 - now * 5);
            const expansion = 1 + ((v * 30 * flare) / dist); // Expansion influenced by vocals and flare, inversely proportional to distance

            cPos[idx] = ox * expansion;
            cPos[idx + 1] = this.diskOrig[idx + 1];
            cPos[idx + 2] = oz * expansion;
        }
        this.diskGeo.attributes.position.needsUpdate = true;
        this.diskGroup.rotation.y += 0.005 + (v * 0.02);
        this.diskMat.color.setHSL((0 + (v * 40)) / 360, 1.0, 0.5 + (v * 0.4)); // Color shifts based on vocals
        this.diskMat.size = 1.2 + (v * 1.5);
    },

    setActive(active) { this.group.visible = active; }
};

// --- PRESET MANAGER ---
const presets = {
    tunnel: HyperTunnelPreset,
    eclipse: EclipseCanyonPreset
};

// Start with null so the initial load doesn't trigger the safety block
let activePresetKey = null;

function setupPresets() {
    HyperTunnelPreset.init(scene);
    EclipseCanyonPreset.init(scene);

    // Force both to hide initially
    HyperTunnelPreset.setActive(false);
    EclipseCanyonPreset.setActive(false);

    // This will now successfully run because activePresetKey is null
    switchPreset('tunnel');

    const selectEl = document.getElementById('preset-select');
    if (selectEl) {
        selectEl.addEventListener('change', (e) => switchPreset(e.target.value));
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') switchPreset('tunnel');
        if (e.key === '2') switchPreset('eclipse');
    });
}

function switchPreset(key) {
    if (!presets[key] || key === activePresetKey) return;

    // Safely hide the old preset only if one is already active
    if (activePresetKey) {
        presets[activePresetKey].setActive(false);
    }
    
    // Show the new preset
    presets[key].setActive(true);
    activePresetKey = key;

    const selectEl = document.getElementById('preset-select');
    if (selectEl) selectEl.value = key;

    // Sync camera config
    const config = presets[key].cameraConfig;
    camera.fov = config.fov;
    camera.position.set(...config.pos);
    camera.lookAt(...config.lookAt);
    camera.updateProjectionMatrix();
    scene.fog = config.fog;
}

// Initialize the geometries 
setupPresets();

// --- MAIN RENDER LOOP ---
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!isPlaying) return;

    const bassData = new Uint8Array(analyzers[0].frequencyBinCount);
    const drumData = new Uint8Array(analyzers[1].frequencyBinCount);
    const vocalData = new Uint8Array(analyzers[2].frequencyBinCount);
    const otherData = new Uint8Array(analyzers[3].frequencyBinCount);

    analyzers[0].getByteFrequencyData(bassData);
    analyzers[1].getByteFrequencyData(drumData);
    analyzers[2].getByteFrequencyData(vocalData);
    analyzers[3].getByteFrequencyData(otherData);

    const getAvg = (data) => data.reduce((sum, val) => sum + val, 0) / data.length;
    
    // Scale 0-255 values down to fit the preset engines
    const stemsData = {
        bass: getAvg(bassData.slice(0, 10)),
        drums: getAvg(drumData),
        vocals: getAvg(vocalData),
        melody: getAvg(otherData)
    };

    const now = Date.now() * 0.001;

    // Route the audio data into whichever visualizer is currently active
    if (presets[activePresetKey]) {
        presets[activePresetKey].update(stemsData, now);
    }

    // Slow cinematic pan for the Eclipse camera so it isn't completely static
    if (activePresetKey === 'eclipse') {
        camera.position.x = Math.sin(now * 0.1) * 15;
        camera.lookAt(...presets['eclipse'].cameraConfig.lookAt);
    }

    renderer.render(scene, camera);
}