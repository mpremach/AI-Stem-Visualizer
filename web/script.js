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
        
        // Start a progress bar animation that simulates progress until the actual processing is done
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
         // Small delay to ensure the user sees the progress bar reach 100%
        setTimeout(async () => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('top-bar').style.display = 'block';
            await loadAudio(currentTrackName);
        }, 500);
    }

    // Event listeners for upload buttons and folder buttons
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

// Camera setup
camera.position.z = 93;

// Dual-Layer Central Core
const innerGeo = new THREE.IcosahedronGeometry(9, 1);
const innerMat = new THREE.MeshBasicMaterial({ color: 0x38024f, wireframe: false }); // Solid pink heart
const innerCore = new THREE.Mesh(innerGeo, innerMat);
scene.add(innerCore);

const outerGeo = new THREE.IcosahedronGeometry(15, 2);
const outerMat = new THREE.MeshBasicMaterial({ color: 0x220e87f, wireframe: true }); // Wireframe shell
const outerShell = new THREE.Mesh(outerGeo, outerMat);
scene.add(outerShell);

// 3D Hyper-Tunnel (Cylindrical Particle Generation)
const particleGeo = new THREE.BufferGeometry();
const particleCount = 1000;
const posArray = new Float32Array(particleCount * 3);

for(let i = 0; i < particleCount; i++) {
    const radius = 30 + Math.random() * 120; // Hollow center so particles don't block the core
    const angle = Math.random() * Math.PI * 2;
    posArray[i * 3] = Math.cos(angle) * radius;     // X axis
    posArray[i * 3 + 1] = Math.sin(angle) * radius; // Y axis
    posArray[i * 3 + 2] = (Math.random() - 0.5) * 200; // Z axis (depth)
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particleMat = new THREE.PointsMaterial({
    size: 0.6, color: 0xffffff, transparent: true, opacity: 0.8
});
const particlesMesh = new THREE.Points(particleGeo, particleMat);
scene.add(particlesMesh);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

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
    const bassAvg = getAvg(bassData.slice(0, 10));
    const drumAvg = getAvg(drumData);
    const vocalAvg = getAvg(vocalData);
    const otherAvg = getAvg(otherData);

    // BASS: Pulse the size of both inner heart and outer shell
    const scale = 1 + (bassAvg * 0.013);
    innerCore.scale.set(scale, scale, scale);
    outerShell.scale.set(scale, scale, scale);

    // VOCALS: Shift the color of the outer wireframe 
    const hue = (280 - (vocalAvg * 0.8)) / 360; 
    outerShell.material.color.setHSL(hue, 1.0, 0.6);

    // MELODY: Spin cores in opposite directions and twist the tunnel
    innerCore.rotation.x += 0.01 + (otherAvg * 0.0002);
    innerCore.rotation.y += 0.01 + (otherAvg * 0.0002);
    outerShell.rotation.x -= 0.005 + (otherAvg * 0.0005);
    outerShell.rotation.y -= 0.005 + (otherAvg * 0.0005);
    particlesMesh.rotation.z += 0.002 + (otherAvg * 0.0001);

    // DRUMS: Throw the tunnel particles toward the camera (Warp Speed)
    const positions = particlesMesh.geometry.attributes.position.array;
    for(let i = 2; i < particleCount * 3; i += 3) {
        positions[i] += 0.3 + (drumAvg * 0.04); // Speed multiplier
        if(positions[i] > 50) positions[i] = -150; // Loop back far away
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}