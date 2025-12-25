import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- CONFIGURATION ---
const CONFIG = {
    speed: 0,
    maxSpeed: 2.5,
    acceleration: 0.02,
    friction: 0.98,
    turnSpeed: 0.08,
    fov: 75
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
// Thick fog for atmosphere (hides the end of the world)
scene.fog = new THREE.FogExp2(0x050505, 0.025);

const camera = new THREE.PerspectiveCamera(CONFIG.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias false is better for performance with Bloom
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping; // Cinematic lighting
document.body.appendChild(renderer.domElement);

// --- POST-PROCESSING (THE GLOW EFFECT) ---
const renderScene = new RenderPass(scene, camera);

// Resolution, Strength, Radius, Threshold
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 2.0; // INTENSE GLOW
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- ASSETS & GENERATION ---

// 1. The Infinite Grid Floor (Cyberpunk Style)
const gridHelper = new THREE.GridHelper(2000, 100, 0xff00de, 0x220044);
gridHelper.position.y = -1;
scene.add(gridHelper);

// 2. Moving Floor Plane (Reflective)
const planeGeo = new THREE.PlaneGeometry(2000, 2000);
const planeMat = new THREE.MeshStandardMaterial({ 
    color: 0x050505, 
    roughness: 0.1, 
    metalness: 0.8 
});
const floor = new THREE.Mesh(planeGeo, planeMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.1;
scene.add(floor);

// 3. The Player Car (High Detail Group)
const player = new THREE.Group();

// Car Body
const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4.5);
const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    roughness: 0.2, 
    metalness: 0.9 
}); 
const carBody = new THREE.Mesh(bodyGeo, bodyMat);
player.add(carBody);

// Glowing Cockpit
const glassGeo = new THREE.BoxGeometry(1.8, 0.6, 2);
const glassMat = new THREE.MeshStandardMaterial({ 
    color: 0x000000, 
    emissive: 0x00f3ff, // Cyan Glow
    emissiveIntensity: 0.5,
    roughness: 0,
    metalness: 1
});
const glass = new THREE.Mesh(glassGeo, glassMat);
glass.position.set(0, 0.6, -0.5);
player.add(glass);

// Rear Engine Thrusters (Very Bright Pink)
const thrusterGeo = new THREE.CylinderGeometry(0.4, 0.4, 1, 16);
const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff00de });
const t1 = new THREE.Mesh(thrusterGeo, thrusterMat);
t1.rotation.x = Math.PI / 2;
t1.position.set(-0.6, 0, 2.3);
const t2 = t1.clone();
t2.position.set(0.6, 0, 2.3);
player.add(t1);
player.add(t2);

// Underglow Light
const underGlow = new THREE.PointLight(0x00f3ff, 5, 20);
underGlow.position.set(0, -1, 0);
player.add(underGlow);

scene.add(player);


// 4. Procedural City Generation
const buildings = [];
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
// Neon edges material
const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x001133,
    roughness: 0.1,
    metalness: 0.8
});

function spawnBuilding(zPos) {
    const height = Math.random() * 50 + 20;
    const width = Math.random() * 5 + 5;
    
    const building = new THREE.Mesh(boxGeo, buildingMat);
    building.scale.set(width, height, width);
    
    // Position on either side of the "road"
    const side = Math.random() > 0.5 ? 1 : -1;
    const xPos = side * (Math.random() * 100 + 20); // Keep center clear
    
    building.position.set(xPos, height / 2 - 5, zPos);
    scene.add(building);
    
    // Add glowing windows (randomly)
    if(Math.random() > 0.5) {
        const winGeo = new THREE.BoxGeometry(width + 0.2, 1, width + 0.2);
        const winMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00f3ff : 0xff00de });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.y = Math.random() * height/2;
        building.add(win);
    }

    buildings.push(building);
}

// Initial City Population
for(let i=0; i<100; i++) {
    spawnBuilding(-i * 30);
}

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(-10, 50, -20);
scene.add(sunLight);

// --- GAME LOGIC ---
const keys = { w: false, a: false, s: false, d: false };
let isPlaying = false;
let score = 0;

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('start-screen').style.display = 'none';
        isPlaying = true;
    }, 500);
});

function animate() {
    requestAnimationFrame(animate);

    if (isPlaying) {
        // 1. Car Physics
        if (keys['w']) CONFIG.speed += CONFIG.acceleration;
        if (keys['s']) CONFIG.speed -= CONFIG.acceleration;
        
        // Clamp speed
        CONFIG.speed = Math.max(0, Math.min(CONFIG.speed, CONFIG.maxSpeed));
        
        // Friction
        if (!keys['w'] && !keys['s']) CONFIG.speed *= CONFIG.friction;

        // Turning
        if (CONFIG.speed > 0.1) {
            if (keys['a']) player.position.x += CONFIG.turnSpeed * (CONFIG.speed * 2);
            if (keys['d']) player.position.x -= CONFIG.turnSpeed * (CONFIG.speed * 2);
            
            // Bank angle (tilt)
            const targetTilt = keys['a'] ? 0.3 : (keys['d'] ? -0.3 : 0);
            player.rotation.z += (targetTilt - player.rotation.z) * 0.1;
        }

        // 2. Environment Movement (Infinite Runner Trick)
        // Instead of moving the car forward, we move the buildings backward
        const moveSpeed = CONFIG.speed * 2;
        
        gridHelper.position.z += moveSpeed;
        if(gridHelper.position.z > 50) gridHelper.position.z = 0;

        // Move Buildings
        for(let i = buildings.length - 1; i >= 0; i--) {
            const b = buildings[i];
            b.position.z += moveSpeed;
            
            // If building passes camera, respawn it far ahead
            if(b.position.z > 20) {
                b.position.z = -3000; // Far Draw Distance
                b.position.x = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 200 + 30);
                
                // Update Score
                score += 10;
                document.getElementById('score-display').innerText = score.toString().padStart(4, '0');
            }
        }

        // 3. Camera Chase Physics
        // Camera lags slightly behind player for "weight"
        const targetCamX = player.position.x * 0.8;
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        
        // Dynamic FOV based on speed (Speed effect)
        const targetFOV = 75 + (CONFIG.speed * 20);
        camera.fov += (targetFOV - camera.fov) * 0.05;
        camera.updateProjectionMatrix();

        // 4. HUD Update
        const displaySpeed = Math.floor(CONFIG.speed * 120);
        document.getElementById('speed-display').innerText = displaySpeed + " KM/H";
        
        // Shake Effect at high speed
        if(CONFIG.speed > 2.0) {
            camera.position.y = 4 + (Math.random() * 0.1);
            camera.position.x += (Math.random() * 0.1);
        } else {
            camera.position.y = 4;
        }

    } else {
        // Menu Animation (Idle Flyby)
        buildings.forEach(b => b.position.z += 1);
    }

    // Render with Bloom
    composer.render();
}

// Initial Camera Setup
camera.position.set(0, 4, 10);
camera.lookAt(player.position);

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();