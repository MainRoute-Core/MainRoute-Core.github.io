const coreGameTitle = document.getElementById('core-game-title');
const Div404Container = document.getElementById('div-404-container');
const Div404GameContainer = document.getElementById('div-404-game-container');
const btn404GameLoad = document.getElementById('btn-load-404-game');
const btn404GameQuit = document.getElementById('btn-quit-404-game');
const coreGameCliickPad = document.getElementById('core-game-click-pad');
const coreGameBoard = document.getElementById('core-game-board');
const coreGamePlayer = document.getElementById('core-game-player');
const coreGameOverlay = document.getElementById('core-game-overlay');
const coreGameOverlayTitle = document.getElementById('core-overlay-title');
const coreGameOverlayDesc = document.getElementById('core-overlay-desc');
const coreScore = document.getElementById('core-score');
const coreHighScore = document.getElementById('core-hight-score');
// --- SVGs for Obstacles (Tech Theme) ---
const obstacleDesigns = [
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c-2 1.8-3.6 3.5-5.5 3.8"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`
];
let animationFrameId;
let isPlaying = false;
let isGameOver = false;
let score = 0;
let highScore = localStorage.getItem('mrc-hi-score') || 0;
coreHighScore.innerText = String(highScore).padStart(5, '0');
let speed = 6;
let frameCounter = 0;
let spawnRate = 90;
let obstacles = [];
let playerY = 0;
let velocityY = 0;
const gravity = 0.8;
const jumpPower = 14;
btn404GameLoad.addEventListener('click', () => {
    Div404Container.classList.add('hidden');
    Div404GameContainer.classList.remove('hidden');
    coreGameTitle.innerText = "Core Roll | MainRoute Core";
    resetGameEnvironment();
});
btn404GameQuit.addEventListener('click', () => {
    Div404GameContainer.classList.add('hidden');
    Div404Container.classList.remove('hidden');
    coreGameTitle.innerText = "404 - Route Not Found | MainRoute Core";
    haltEngine();
});
function handleInput(e) {
    if (e.type === 'keydown') {
        if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
        e.preventDefault();
    }
    if (e.type === 'touchstart') e.preventDefault();
    if (!isPlaying) {
        if (isGameOver) {
            resetGameEnvironment();
        }
        startGame();
    } else if (playerY === 0) {
        velocityY = jumpPower;
    }
}
function startGame() {
    isPlaying = true;
    isGameOver = false;
    coreGameOverlay.style.display = 'none';
    gameLoop();
}
function resetGameEnvironment() {
    haltEngine();
    obstacles.forEach(obs => obs.element.remove());
    obstacles = [];
    score = 0;
    speed = 6;
    frameCounter = 0;
    playerY = 0;
    velocityY = 0;
    updateVisuals();
    coreScore.innerText = '00000';
    coreGameOverlayTitle.innerText = "Core Roll";
    coreGameOverlayDesc.innerText = "Tap screen or press Space to initialize Core Roll";
    coreGameOverlay.style.display = 'flex';
}
function haltEngine() {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    coreGamePlayer.querySelector('svg').style.filter = "none";
    coreGamePlayer.querySelectorAll('#K-Orbit,#L-Orbit,#M-Orbit').forEach(All => {
        All.style.animation = null;
    });
}
function gameOver() {
    haltEngine();
    isGameOver = true;

    if (Math.floor(score / 10) > highScore) {
        highScore = Math.floor(score / 10);
        localStorage.setItem('mrc-hi-score', highScore);
        coreHighScore.innerText = String(highScore).padStart(5, '0');
    }
    coreGamePlayer.querySelector('svg').style.filter = "grayscale(1)";
    coreGamePlayer.querySelectorAll('#K-Orbit,#L-Orbit,#M-Orbit').forEach(All => {
        All.style.animation = "none";
    });
    coreGameOverlayTitle.innerText = "Core Over";
    coreGameOverlayDesc.innerText = "Tap To Re-Initialize.";
    coreGameOverlay.style.display = 'flex';
}
function gameLoop() {
    if (!isPlaying) return;
    if (playerY > 0 || velocityY > 0) {
        playerY += velocityY;
        velocityY -= gravity;
    }
    if (playerY <= 0) {
        playerY = 0;
        velocityY = 0;
    }
    frameCounter++;
    if (frameCounter >= spawnRate) {
        spawnObstacle();
        frameCounter = 0;
        spawnRate = Math.max(45, Math.floor(Math.random() * 60) + 50 - (speed * 1.5));
    }
    const pLeft = 50 + 5;
    const pRight = 50 + 45 - 5;
    const pBottom = playerY + 5;
    const pTop = playerY + 45 - 5;

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= speed;
        let oLeft = obs.x;
        let oRight = obs.x + 35;
        let oTop = 40;

        if (pRight > oLeft && pLeft < oRight && pBottom < oTop) {
            gameOver();
            return;
        }
        if (obs.x < -50) {
            obs.element.remove();
            obstacles.splice(i, 1);
            i--;
        }
    }
    score++;
    if (score % 10 === 0) {
        coreScore.innerText = String(Math.floor(score / 10)).padStart(5, '0');
    }
    if (score % 500 === 0 && speed < 16) {
        speed += 0.5;
    }
    updateVisuals();
    animationFrameId = requestAnimationFrame(gameLoop);
}
function spawnObstacle() {
    const obsEl = document.createElement('div');
    obsEl.classList.add('game-obstacle');
    obsEl.innerHTML = obstacleDesigns[Math.floor(Math.random() * obstacleDesigns.length)];
    coreGameBoard.appendChild(obsEl);
    obstacles.push({
        element: obsEl,
        x: coreGameBoard.offsetWidth
    });
}
function updateVisuals() {
    coreGamePlayer.style.transform = `translate3d(0, ${-playerY}px, 0)`;
    for (let obs of obstacles) {
        obs.element.style.transform = `translate3d(${obs.x}px, 0, 0)`;
    }
}
window.addEventListener('keydown', handleInput);
coreGameBoard.addEventListener('mousedown', handleInput);
coreGameBoard.addEventListener('touchstart', handleInput, { passive: false });
coreGameCliickPad.addEventListener('mousedown', handleInput);
coreGameCliickPad.addEventListener('touchstart', handleInput, { passive: false });