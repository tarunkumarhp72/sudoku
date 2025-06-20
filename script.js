class ModernSudokuGame {
    constructor() {
        this.currentDifficulty = 'easy';
        this.solution = [];
        this.puzzle = [];
        this.startTime = null;
        this.timerInterval = null;
        this.isComplete = false;
        this.hintsLeft = 3;
        this.score = 0;
        this.streak = 0;
        this.combo = 0;
        this.correctMoves = 0;
        
        this.initializeBackground();
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeBackground() {
      const canvas = document.getElementById('background-canvas');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Create morphing gradient blobs
      const blobs = [];
      const blobCount = 6;
      
      for (let i = 0; i < blobCount; i++) {
          const geometry = new THREE.SphereGeometry(1, 32, 32);
          
          // Gradient material shader
          const material = new THREE.ShaderMaterial({
              uniforms: {
                  time: { value: 0 },
                  colorA: { value: new THREE.Color(0x667eea) },
                  colorB: { value: new THREE.Color(0x764ba2) }
              },
              vertexShader: `
                  varying vec2 vUv;
                  varying vec3 vPosition;
                  uniform float time;
                  
                  void main() {
                      vUv = uv;
                      vPosition = position;
                      
                      vec3 newPosition = position;
                      newPosition += normal * sin(time + position.x * 2.0) * 0.1;
                      newPosition += normal * cos(time + position.y * 3.0) * 0.08;
                      
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                  }
              `,
              fragmentShader: `
                  uniform vec3 colorA;
                  uniform vec3 colorB;
                  uniform float time;
                  varying vec2 vUv;
                  varying vec3 vPosition;
                  
                  void main() {
                      float mixer = sin(time + vPosition.x) * 0.5 + 0.5;
                      vec3 color = mix(colorA, colorB, mixer);
                      gl_FragColor = vec4(color, 0.3);
                  }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending
          });
          
          const blob = new THREE.Mesh(geometry, material);
          blob.position.set(
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8
          );
          
          blob.userData = {
              speed: Math.random() * 0.02 + 0.01,
              amplitude: Math.random() * 2 + 1
          };
          
          scene.add(blob);
          blobs.push(blob);
      }
      
      camera.position.z = 5;
      
      const animate = () => {
          requestAnimationFrame(animate);
          const time = Date.now() * 0.001;
          
          blobs.forEach((blob, index) => {
              blob.material.uniforms.time.value = time;
              blob.position.x += Math.sin(time * blob.userData.speed + index) * 0.01;
              blob.position.y += Math.cos(time * blob.userData.speed + index) * 0.01;
              blob.rotation.x += 0.005;
              blob.rotation.y += 0.003;
          });
          
          renderer.render(scene, camera);
      };
      
      animate();        
  
      // Handle resize
      window.addEventListener('resize', () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
      });
  }

    initializeGame() {
        this.generatePuzzle();
        this.renderGrid();
        this.startTimer();
        this.updateUI();
    }

    setupEventListeners() {
        // Difficulty buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDifficulty = e.target.dataset.difficulty;
                this.resetHints();
                this.generatePuzzle();
                this.renderGrid();
                this.resetTimer();
                this.updateUI();
            });
        });

        // Control buttons
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('hint-btn').addEventListener('click', () => this.giveHint());
        document.getElementById('check-btn').addEventListener('click', () => this.checkSolution());
        document.getElementById('show-answer-btn').addEventListener('click', () => this.showSolution());
    }

    generatePuzzle() {
        this.solution = this.generateCompleteSudoku();
        this.puzzle = this.solution.map(row => [...row]);
        
        const cellsToRemove = {
            easy: 35,
            medium: 45,
            hard: 55
        };

        const toRemove = cellsToRemove[this.currentDifficulty];
        let removed = 0;

        while (removed < toRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.puzzle[row][col] !== 0) {
                this.puzzle[row][col] = 0;
                removed++;
            }
        }
    }

    generateCompleteSudoku() {
        const grid = Array(9).fill().map(() => Array(9).fill(0));
        
        for (let i = 0; i < 9; i += 3) {
            this.fillBox(grid, i, i);
        }
        
        this.solveSudoku(grid);
        return grid;
    }

    fillBox(grid, row, col) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.shuffle(nums);
        
        let idx = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                grid[row + i][col + j] = nums[idx++];
            }
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    solveSudoku(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidMove(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (this.solveSudoku(grid)) {
                                return true;
                            }
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValidMove(grid, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }

        // Check 3x3 box
        const startRow = row - row % 3;
        const startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }

        return true;
    }

    renderGrid() {
        const grid = document.getElementById('sudoku-grid');
        grid.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('input');
                cell.className = 'sudoku-cell';
                cell.type = 'text';
                cell.maxLength = 1;
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.puzzle[row][col] !== 0) {
                    cell.value = this.puzzle[row][col];
                    cell.classList.add('prefilled');
                    cell.readOnly = true;
                }

                cell.addEventListener('input', (e) => this.handleInput(e));
                cell.addEventListener('keydown', (e) => this.handleKeyDown(e));
                
                grid.appendChild(cell);
            }
        }
    }

    handleInput(e) {
        const value = e.target.value;
        
        if (!/^[1-9]$/.test(value)) {
            e.target.value = '';
            return;
        }

        // Remove any existing status classes
        e.target.classList.remove('error', 'correct', 'hint');
        
        // Check if all cells are filled to show/hide check button
        this.checkAllFilled();
    }

    checkAllFilled() {
        const cells = document.querySelectorAll('.sudoku-cell:not(.prefilled)');
        const allFilled = Array.from(cells).every(cell => cell.value !== '');
        
        document.getElementById('check-btn').style.display = allFilled ? 'inline-block' : 'none';
    }

    handleKeyDown(e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.navigateGrid(e.target, e.key);
        }
    }

    navigateGrid(currentCell, direction) {
        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);
        let newRow = row, newCol = col;

        switch (direction) {
            case 'ArrowUp': newRow = Math.max(0, row - 1); break;
            case 'ArrowDown': newRow = Math.min(8, row + 1); break;
            case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
            case 'ArrowRight': newCol = Math.min(8, col + 1); break;
        }

        const targetCell = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
        if (targetCell && !targetCell.readOnly) {
            targetCell.focus();
        }
    }

    giveHint() {
        if (this.hintsLeft <= 0) return;
        
        const emptyCells = [];
        document.querySelectorAll('.sudoku-cell:not(.prefilled)').forEach(cell => {
            if (!cell.value) {
                emptyCells.push(cell);
            }
        });
        
        if (emptyCells.length === 0) return;
        
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const row = parseInt(randomCell.dataset.row);
        const col = parseInt(randomCell.dataset.col);
        
        randomCell.value = this.solution[row][col];
        randomCell.classList.add('hint');
        randomCell.readOnly = true;
        
        this.hintsLeft--;
        this.updateUI();
        
        setTimeout(() => {
            randomCell.classList.remove('hint');
            randomCell.classList.add('correct');
        }, 1000);
    }

    checkCompletion() {
        // This method is no longer needed, but keeping it empty for compatibility
        // All functionality moved to checkAllFilled()
    }

    autoCheckSolution() {
        const cells = document.querySelectorAll('.sudoku-cell');
        let isCorrect = true;

        cells.forEach(cell => {
            if (!cell.readOnly || !cell.classList.contains('prefilled')) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const value = parseInt(cell.value);
                
                if (value !== this.solution[row][col]) {
                    isCorrect = false;
                }
            }
        });

        if (isCorrect && !this.isComplete) {
            this.isComplete = true;
            this.stopTimer();
            this.streak++;
            this.updateScore(true, true); // Bonus for completion
            this.showSuccessMessage();
            this.createFireworks();
        }
    }

    checkSolution() {
        const cells = document.querySelectorAll('.sudoku-cell');
        let isCorrect = true;
        let hasErrors = false;

        // First, remove all error/correct classes
        cells.forEach(cell => {
            cell.classList.remove('error', 'correct');
        });

        // Check each cell and mark errors
        cells.forEach(cell => {
            if (!cell.readOnly || !cell.classList.contains('prefilled')) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const value = parseInt(cell.value);
                
                if (value !== this.solution[row][col]) {
                    isCorrect = false;
                    hasErrors = true;
                    cell.classList.add('error');
                }
            }
        });

        if (isCorrect && !this.isComplete) {
            // All correct - mark as complete
            cells.forEach(cell => {
                if (!cell.classList.contains('prefilled') && !cell.classList.contains('hint')) {
                    cell.classList.add('correct');
                }
            });
            
            this.isComplete = true;
            this.stopTimer();
            this.streak++;
            this.updateScore(true, true);
            this.showSuccessMessage();
            this.createFireworks();
        }
    }

    showSolution() {
        const cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            if (!cell.readOnly || !cell.classList.contains('prefilled')) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                cell.value = this.solution[row][col];
                cell.classList.add('correct');
                cell.readOnly = true;
            }
        });
        
        this.isComplete = true;
        this.stopTimer();
        document.getElementById('check-btn').style.display = 'none';
    }

    startNewGame() {
        this.isComplete = false;
        this.correctMoves = 0;
        this.combo = 0;
        this.resetHints();
        this.generatePuzzle();
        this.renderGrid();
        this.resetTimer();
        this.updateUI();
        document.getElementById('check-btn').style.display = 'none';
        document.getElementById('success-overlay').style.display = 'none';
    }

    resetHints() {
        const hintsMap = {
            easy: 3,
            medium: 2,
            hard: 1
        };
        this.hintsLeft = hintsMap[this.currentDifficulty];
    }

    updateScore(isCorrect, isCompletion = false) {
        const basePoints = {
            easy: 10,
            medium: 20,
            hard: 30
        };

        if (isCompletion && isCorrect) {
            // Only give points for successful completion
            let points = basePoints[this.currentDifficulty] * 10; // Completion bonus
            this.score += points;
        }

        this.updateUI();
    }

    showCombo() {
        const comboText = document.createElement('div');
        comboText.className = 'combo-text';
        comboText.textContent = `${this.combo}x COMBO!`;
        document.body.appendChild(comboText);

        setTimeout(() => {
            document.body.removeChild(comboText);
        }, 1000);
    }

    createFireworks() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
                firework.style.left = Math.random() * window.innerWidth + 'px';
                firework.style.top = Math.random() * window.innerHeight + 'px';
                document.body.appendChild(firework);

                setTimeout(() => {
                    document.body.removeChild(firework);
                }, 1000);
            }, i * 100);
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        if (this.isComplete) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.startTimer();
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    updateUI() {
        document.getElementById('current-difficulty').textContent = 
            this.currentDifficulty.charAt(0).toUpperCase() + this.currentDifficulty.slice(1);
        document.getElementById('hints-left').textContent = this.hintsLeft;
        document.getElementById('score').textContent = this.score;
        document.getElementById('streak-count').textContent = this.streak;
        
        // Disable hint button if no hints left
        const hintBtn = document.getElementById('hint-btn');
        hintBtn.disabled = this.hintsLeft <= 0;
        if (this.hintsLeft <= 0) {
            hintBtn.style.opacity = '0.5';
            hintBtn.textContent = 'No Hints';
        } else {
            hintBtn.style.opacity = '1';
            hintBtn.textContent = 'Hint';
        }
    }

    showSuccessMessage() {
        const finalTime = document.getElementById('timer').textContent;
        document.getElementById('final-time').textContent = finalTime;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('success-overlay').style.display = 'flex';
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ModernSudokuGame();
});

function startNewGame() {
    game.startNewGame();
}