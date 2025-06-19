// Game State
let gameState = {
    currentPuzzle: [],
    solution: [],
    difficulty: 'easy',
    timer: 0,
    timerInterval: null,
    hintsUsed: 0,
    isGameActive: false
};

// Difficulty settings
const difficultySettings = {
    easy: { cellsToRemove: 6 },
    medium: { cellsToRemove: 8 },
    hard: { cellsToRemove: 10 }
};

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeBackgroundAnimation();
    initializeGame();
    setupEventListeners();
});

// Background Animation with Three.js
function initializeBackgroundAnimation() {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Create floating geometric shapes
    const shapes = [];
    const geometries = [
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.ConeGeometry(0.5, 1, 8)
    ];

    // Create multiple floating shapes
    for (let i = 0; i < 15; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        
        const shape = new THREE.Mesh(geometry, material);
        
        // Random position
        shape.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );
        
        // Random rotation speed
        shape.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            floatSpeed: Math.random() * 0.01 + 0.005,
            floatOffset: Math.random() * Math.PI * 2
        };
        
        shapes.push(shape);
        scene.add(shape);
    }

    camera.position.z = 10;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        shapes.forEach((shape, index) => {
            // Rotate shapes
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
            
            // Float up and down
            shape.position.y += Math.sin(Date.now() * shape.userData.floatSpeed + shape.userData.floatOffset) * 0.01;
        });
        
        renderer.render(scene, camera);
    }
    
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Initialize game
function initializeGame() {
    createSudokuGrid();
    generateNewGame();
}

// Setup event listeners
function setupEventListeners() {
    // Difficulty selection
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.difficulty = btn.dataset.level;
            generateNewGame();
        });
    });

    // Game controls
    document.getElementById('new-game-btn').addEventListener('click', generateNewGame);
    document.getElementById('check-btn').addEventListener('click', checkSolution);
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    document.getElementById('solve-btn').addEventListener('click', solvePuzzle);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        hideModal();
        generateNewGame();
    });

    // Close modal when clicking outside
    document.getElementById('success-modal').addEventListener('click', (e) => {
        if (e.target.id === 'success-modal') {
            hideModal();
        }
    });
}

// Create the Sudoku grid HTML
function createSudokuGrid() {
    const grid = document.getElementById('sudoku-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('input');
        cell.type = 'number';
        cell.className = 'cell';
        cell.min = '1';
        cell.max = '4';
        cell.maxLength = '1';
        cell.dataset.index = i;
        
        // Input validation
        cell.addEventListener('input', (e) => {
            let value = e.target.value;
            if (value && (value < 1 || value > 4 || value.length > 1)) {
                e.target.value = '';
                return;
            }
            
            // Remove previous validation classes
            e.target.classList.remove('correct', 'incorrect');
            
            // Auto-check if all cells are filled
            if (isGridComplete()) {
                setTimeout(checkSolution, 300);
            }
        });
        
        grid.appendChild(cell);
    }
}

// Generate a valid 4x4 Sudoku solution
function generateValidSudoku() {
    const grid = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
    ];
    
    // Shuffle the grid to create variation
    return shuffleSudoku(grid);
}

// Shuffle Sudoku grid while maintaining validity
function shuffleSudoku(grid) {
    const newGrid = grid.map(row => [...row]);
    
    // Random transformations that preserve Sudoku validity
    const transformations = [
        () => swapRows(newGrid, 0, 1),
        () => swapRows(newGrid, 2, 3),
        () => swapCols(newGrid, 0, 1),
        () => swapCols(newGrid, 2, 3),
        () => swapRowBlocks(newGrid),
        () => swapColBlocks(newGrid)
    ];
    
    // Apply random transformations
    for (let i = 0; i < 5; i++) {
        transformations[Math.floor(Math.random() * transformations.length)]();
    }
    
    return newGrid;
}

// Helper functions for shuffling
function swapRows(grid, row1, row2) {
    [grid[row1], grid[row2]] = [grid[row2], grid[row1]];
}

function swapCols(grid, col1, col2) {
    for (let row = 0; row < 4; row++) {
        [grid[row][col1], grid[row][col2]] = [grid[row][col2], grid[row][col1]];
    }
}

function swapRowBlocks(grid) {
    for (let i = 0; i < 2; i++) {
        swapRows(grid, i, i + 2);
    }
}

function swapColBlocks(grid) {
    for (let i = 0; i < 2; i++) {
        swapCols(grid, i, i + 2);
    }
}

// Generate new game
function generateNewGame() {
    stopTimer();
    resetTimer();
    resetHints();
    
    // Generate solution
    gameState.solution = generateValidSudoku();
    
    // Create puzzle by removing cells
    gameState.currentPuzzle = gameState.solution.map(row => [...row]);
    const settings = difficultySettings[gameState.difficulty];
    
    // Remove cells randomly
    const cellsToRemove = settings.cellsToRemove;
    const positions = [];
    for (let i = 0; i < 16; i++) {
        positions.push(i);
    }
    
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Remove cells
    for (let i = 0; i < cellsToRemove; i++) {
        const pos = positions[i];
        const row = Math.floor(pos / 4);
        const col = pos % 4;
        gameState.currentPuzzle[row][col] = 0;
    }
    
    // Update UI
    updateGrid();
    startTimer();
    gameState.isGameActive = true;
}

// Update grid display
function updateGrid() {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const value = gameState.currentPuzzle[row][col];
        
        cell.classList.remove('correct', 'incorrect');
        
        if (value === 0) {
            cell.value = '';
            cell.readOnly = false;
            cell.style.background = '';
        } else {
            cell.value = value;
            cell.readOnly = true;
        }
    });
}

// Check if grid is complete
function isGridComplete() {
    const cells = document.querySelectorAll('.cell');
    return Array.from(cells).every(cell => cell.value !== '');
}

// Check solution
function checkSolution() {
    if (!gameState.isGameActive) return;
    
    const cells = document.querySelectorAll('.cell');
    let isCorrect = true;
    let hasEmptyCells = false;
    
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const userValue = parseInt(cell.value) || 0;
        const correctValue = gameState.solution[row][col];
        
        cell.classList.remove('correct', 'incorrect');
        
        if (userValue === 0) {
            hasEmptyCells = true;
        } else if (userValue !== correctValue) {
            isCorrect = false;
            if (!cell.readOnly) {
                cell.classList.add('incorrect');
            }
        } else if (!cell.readOnly) {
            cell.classList.add('correct');
        }
    });
    
    if (hasEmptyCells) {
        showMessage('Please fill in all cells before checking!', 'warning');
        return;
    }
    
    if (isCorrect) {
        gameWon();
    } else {
        showMessage('Some answers are incorrect. Keep trying!', 'error');
    }
}

// Give hint
function giveHint() {
    if (!gameState.isGameActive) return;
    
    const cells = document.querySelectorAll('.cell');
    const emptyCells = Array.from(cells).filter(cell => !cell.readOnly && !cell.value);
    
    if (emptyCells.length === 0) {
        showMessage('No empty cells to give hints for!', 'info');
        return;
    }
    
    // Select random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const index = parseInt(randomCell.dataset.index);
    const row = Math.floor(index / 4);
    const col = index % 4;
    
    randomCell.value = gameState.solution[row][col];
    randomCell.classList.add('correct');
    
    gameState.hintsUsed++;
    updateHintsDisplay();
    
    // Check if game is complete after hint
    if (isGridComplete()) {
        setTimeout(checkSolution, 300);
    }
}

// Solve puzzle
function solvePuzzle() {
    if (!gameState.isGameActive) return;
    
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        cell.value = gameState.solution[row][col];
        
        if (!cell.readOnly) {
            cell.classList.add('correct');
        }
    });
    
    setTimeout(() => {
        gameWon();
    }, 500);
}

// Game won
function gameWon() {
    gameState.isGameActive = false;
    stopTimer();
    
    document.getElementById('final-time').textContent = formatTime(gameState.timer);
    document.getElementById('final-hints').textContent = gameState.hintsUsed;
    
    showModal();
}

// Timer functions
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function resetTimer() {
    gameState.timer = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = formatTime(gameState.timer);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Hints functions
function resetHints() {
    gameState.hintsUsed = 0;
    updateHintsDisplay();
}

function updateHintsDisplay() {
    document.getElementById('hints-count').textContent = gameState.hintsUsed;
}

// Modal functions
function showModal() {
    document.getElementById('success-modal').style.display = 'block';
}

function hideModal() {
    document.getElementById('success-modal').style.display = 'none';
}

// Message system
function showMessage(message, type = 'info') {
    // Create temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 1001;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set background color based on type
    const colors = {
        info: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        warning: 'linear-gradient(135deg, #f093fb, #f5576c)',
        error: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
        success: 'linear-gradient(135deg, #43e97b, #38f9d7)'
    };
    
    messageEl.style.background = colors[type] || colors.info;
    
    document.body.appendChild(messageEl);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 3000);
}

// Add CSS animations for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);