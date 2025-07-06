// =======================================================================
// ENHANCED CHESS STRATEGY GAME - WITH KING MECHANICS AND AI
// =======================================================================
console.log('Loading enhanced chess strategy game...');

let game = null;

class ImageManager {
    constructor() { this.images = {}; this.loadedCount = 0; this.totalImages = 0; this.onAllLoaded = null; }
    loadImage(name, path) { this.totalImages++; const img = new Image(); img.onload = () => this._imageLoaded(); img.onerror = () => { console.error(`Failed to load: ${path}`); this._imageLoaded(); }; img.src = path; this.images[name] = img; }
    _imageLoaded() { this.loadedCount++; if (this.loadedCount === this.totalImages && this.onAllLoaded) this.onAllLoaded(); }
    getImage(name) { return this.images[name]; }
}

// =======================================================================
// YENİ BÖLÜM: HAVA DURUMU EFEKTLERİ
// =======================================================================
class Snowflake {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.reset();
    }

    // Kar tanesini sıfırla (ekranın üstünde yeni bir pozisyona koy)
    reset() {
        this.x = Math.random() * this.canvasWidth;
        this.y = Math.random() * -this.canvasHeight; // Ekranın üstünden başlasın
        this.radius = Math.random() * 2 + 1; // 1 ile 3 piksel arası boyut
        this.speedY = Math.random() * 1 + 0.5; // Düşme hızı
        this.speedX = Math.random() * 2 - 1; // Hafif sağa/sola salınım
        this.opacity = Math.random() * 0.5 + 0.3; // Yarı saydamlık
    }

    // Kar tanesini güncelle (her karede pozisyonunu değiştir)
    update() {
        this.y += this.speedY;
        this.x += this.speedX;

        // Ekranın altından çıkarsa, başa sar
        if (this.y > this.canvasHeight) {
            this.reset();
        }
    }

    // Kar tanesini çiz
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
    }
}

window.addEventListener('load', () => { game = new Game(); game.init(); });

// =======================================================================
// UNIT CLASSES
// =======================================================================
class Tile {
    constructor(x, y, name, terrainType, resourceType, resourceAmount) { 
        this.x = x; this.y = y; this.name = name; this.terrainType = terrainType; 
        this.resourceType = resourceType; this.resourceAmount = resourceAmount; 
    }
    canWalkOn() { return this.terrainType !== 'water' && this.terrainType !== 'mountain'; }
    hasResource() { return this.resourceType && this.resourceAmount > 0; }
}

class Unit {
    constructor(x, y, owner, type, game) { 
        this.x = x; this.y = y; this.owner = owner; this.type = type; this.game = game; 
        //this.maxHealth = 100; this.health = 100; 
        this.hasActed = false; 
    }
    resetTurn() { this.hasActed = false; }
    getPossibleMoves() { return []; }
    moveTo(x, y) {
        const from = { x: this.x, y: this.y }; // Eski pozisyonu kaydet
        this.x = x;
        this.y = y;
        this.hasActed = true;
        
        // YENİ: Hareketi günlüğe kaydet
        this.game.logMove(this, from, { x: x, y: y });
    }
    //takeDamage(amount) { this.health -= amount; return this.health <= 0; }
}

// KING CLASS - FIXED POSITION, CANNOT MOVE
// game.js dosyasındaki King sınıfını bulun ve güncelleyin

class King extends Unit {
    constructor(x, y, owner, game) { 
        super(x, y, owner, 'king', game); 
        // this.isFixed özelliğine artık ihtiyacımız yok, silebiliriz.
    }
    
    // ==========================================================
    // YENİ: KRAL'A 1 KARELİK HAREKET YETENEĞİ VERİYORUZ
    // ==========================================================
    getPossibleMoves() {
        const moves = [];
        // Etrafındaki 8 kareyi kontrol et
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue; // Kendisi hariç
                
                const newX = this.x + i;
                const newY = this.y + j;
                
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
                // Eğer hedef karo geçerliyse (harita içinde, yürünebilir ve kendi birimi değilse)
                if (targetInfo.isValid) {
                    moves.push({ x: newX, y: newY, type: targetInfo.type });
                }
            }
        }
        return moves;
    }
}

class Worker extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'worker', game); }
    getPossibleMoves() {
        const moves = [];
        for (let i = -1; i <= 1; i++) { 
            for (let j = -1; j <= 1; j++) { 
                if (i === 0 && j === 0) continue; 
                const newX = this.x + i, newY = this.y + j; 
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner); 
                if (targetInfo.isValid && targetInfo.type === 'move') 
                    moves.push({ x: newX, y: newY, type: 'move' }); 
            } 
        }
        return moves;
    }
}

class Pawn extends Unit { 
    constructor(x, y, owner, game) { super(x, y, owner, 'pawn', game); }
    getPossibleMoves() {
        const moves = [];
        const direction = this.owner === 'human' ? -1 : 1; // Human moves up, AI moves down
        
        // Forward move
        const forwardX = this.x;
        const forwardY = this.y + direction;
        const forwardInfo = this.game.getTileTargetInfo(forwardX, forwardY, this.owner);
        if (forwardInfo.isValid && forwardInfo.type === 'move') {
            moves.push({ x: forwardX, y: forwardY, type: 'move' });
        }
        
        // Diagonal attacks
        for (let dx of [-1, 1]) {
            const attackX = this.x + dx;
            const attackY = this.y + direction;
            const attackInfo = this.game.getTileTargetInfo(attackX, attackY, this.owner);
            if (attackInfo.isValid && attackInfo.type === 'attack') {
                moves.push({ x: attackX, y: attackY, type: 'attack' });
            }
        }
        
        return moves;
    }
}

class Rook extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'rook', game); }
    getPossibleMoves() {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Up, Down, Right, Left
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
                const newX = this.x + dx * i;
                const newY = this.y + dy * i;
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
                if (!targetInfo.isValid) break;
                
                moves.push({ x: newX, y: newY, type: targetInfo.type });
                
                if (targetInfo.type === 'attack') break; // Stop after attack
            }
        }
        return moves;
    }
}

class Bishop extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'bishop', game); }
    getPossibleMoves() {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Diagonals
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
                const newX = this.x + dx * i;
                const newY = this.y + dy * i;
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
                if (!targetInfo.isValid) break;
                
                moves.push({ x: newX, y: newY, type: targetInfo.type });
                
                if (targetInfo.type === 'attack') break; // Stop after attack
            }
        }
        return moves;
    }
}
/*class Bishop extends Unit {
    constructor(x, y, owner, game) {
        super(x, y, owner, 'bishop', game);
    }

    getPossibleMoves() {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // Çapraz yönler

        for (const [dx, dy] of directions) {
            for (let i = 1; i < Math.max(this.game.mapWidth, this.game.mapHeight); i++) {
                const newX = this.x + dx * i;
                const newY = this.y + dy * i;
                
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
                if (!targetInfo.isValid) break;
                
                moves.push({ x: newX, y: newY, type: targetInfo.type });
                
                if (targetInfo.type === 'attack') break;
            }
        }
        return moves;
    }
}*/

class Knight extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'knight', game); }
    getPossibleMoves() {
        const moves = [];
        const knightMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        
        for (let [dx, dy] of knightMoves) {
            const newX = this.x + dx;
            const newY = this.y + dy;
            const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
            
            if (targetInfo.isValid) {
                moves.push({ x: newX, y: newY, type: targetInfo.type });
            }
        }
        return moves;
    }
}

class Queen extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'queen', game); }
    getPossibleMoves() {
        const moves = [];
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0], // Rook moves
            [1, 1], [1, -1], [-1, 1], [-1, -1] // Bishop moves
        ];
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
                const newX = this.x + dx * i;
                const newY = this.y + dy * i;
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
                if (!targetInfo.isValid) break;
                
                moves.push({ x: newX, y: newY, type: targetInfo.type });
                
                if (targetInfo.type === 'attack') break; // Stop after attack
            }
        }
        return moves;
    }
}

// =======================================================================
// RESOURCE AND BUILDING MANAGEMENT
// =======================================================================
class ResourceManager {
    constructor() { 
        this.resources = { wood: 50, gold: 30, stone: 20, meat: 15, grain: 25, fish: 30 }; 
    }
    addResource(type, amount) { 
        if (this.resources[type] !== undefined) this.resources[type] += amount; 
    }
    canAfford(cost) { 
        return Object.keys(cost).every(res => this.resources[res] >= cost[res]); 
    }
    spend(cost) { 
        if (this.canAfford(cost)) { 
            Object.keys(cost).forEach(res => this.resources[res] -= cost[res]); 
            game.updateUI(); 
            return true; 
        } 
        return false; 
    }
}

class BuildingSystem {
    constructor(game) {
        this.game = game;
        this.unitCosts = {
            worker: { wood: 10, meat: 5, fish: 3 },
            pawn: { wood: 25, stone: 10 },
            rook: { stone: 400, gold: 400 },
            bishop: { wood: 800, gold: 350, fish: 60 },
            knight: { meat: 500, stone: 300, fish: 30 },
            queen: { wood: 3000, meat: 1000, gold: 1000, stone: 1500, fish:120 }
        };
    }
    
    produceUnit(unitType, owner) {
        const cost = this.unitCosts[unitType];
        if (!cost) {
            console.log(`Unknown unit type: ${unitType}`);
            return false;
        }
        
        const resourceManager = owner === 'human' ? this.game.humanResources : this.game.aiResources;
        
        if (!resourceManager.canAfford(cost)) {
            console.log(`Not enough resources to produce ${unitType}`);
            return false;
        }
        
        // Find spawn location near the king
        const king = this.game.units.find(u => u.owner === owner && u.type === 'king');
        if (!king) {
            console.log(`No king found for ${owner}`);
            return false;
        }
        
        const spawnLocation = this.findSpawnLocation(king.x, king.y, owner);
        if (!spawnLocation) {
            console.log(`No valid spawn location found for ${unitType}`);
            return false;
        }
        
        // Spend resources and create unit
        resourceManager.spend(cost);
        
        let newUnit;
        switch(unitType) {
            case 'worker': newUnit = new Worker(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            case 'pawn': newUnit = new Pawn(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            case 'rook': newUnit = new Rook(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            case 'bishop': newUnit = new Bishop(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            case 'knight': newUnit = new Knight(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            case 'queen': newUnit = new Queen(spawnLocation.x, spawnLocation.y, owner, this.game); break;
            default:
                console.log(`Unknown unit type: ${unitType}`);
                return false;
        }
        
        this.game.units.push(newUnit);
        // ==========================================================
                // YENİ: Üretim mesajını hamle günlüğüne yazdır
                // ==========================================================
                const message = `Produced a ${unitType.charAt(0).toUpperCase() + unitType.slice(1)}`;
                const color = 'rgba(52, 152, 219, 0.9)'; // Mavi bir renk
                this.game.logSpecialMessage(message, color);
                // ==========================================================
                
                return;
        
        console.log(`${owner} produced ${unitType} at (${spawnLocation.x}, ${spawnLocation.y})`);
        this.game.updateUI();
        return true;
    }
    
    findSpawnLocation(kingX, kingY, owner) {
        // Try to find empty tiles around the king
        for (let radius = 1; radius <= 3; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const x = kingX + dx;
                    const y = kingY + dy;
                    
                    if (this.game.isValidTile(x, y) && 
                        this.game.map[x][y].canWalkOn() && 
                        !this.game.getUnitAt(x, y)) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }
}

// =======================================================================
// MAIN GAME CLASS
// =======================================================================
function Game() {
    this.canvas = document.getElementById('gameCanvas'); 
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 1024; 
    this.canvas.height = 768;
    this.mapWidth = 26; 
    this.mapHeight = 50;
    this.tileSize = { width: 64, height: 32 };
    this.camera = { x: 0, y: 0 }; 
    this.cameraSpeed = 24;
    this.map = []; 
    this.units = []; 
    this.selectedUnit = null; 
    this.possibleMoves = [];
    this.currentPlayer = 'human'; 
    this.turn = 1;
    this.imageManager = new ImageManager(); 
    this.imagesLoaded = false; 
    this.hoveredTile = null;
    this.humanResources = new ResourceManager(); 
    this.aiResources = new ResourceManager();
    this.buildingSystem = new BuildingSystem(this);
    this.gameState = 'playing'; // 'playing', 'human_won', 'ai_won'
    // YENİ: Zorluk seviyesi değişkeni
    this.difficulty = 'easy'; // Varsayılan değer
    // MÜZİK İÇİN YENİ DEĞİŞKENLER
    this.musicPlaylist = ['GameMusic2.mp3', 'GameMusic3.mp3', 'GameMusic4.mp3'];
    this.currentTrackIndex = 0;
    this.audioElement = new Audio();
    // YENİ: Kar efekti için
    this.snowflakes = [];
    this.isSnowing = true; // Kar yağışını açıp kapatmak için
    // YENİ: Hamle günlüğü için mesaj listesi
    this.moveLogMessages = [];
}

// GAME INITIALIZATION
Game.prototype.init = function() {
    // YENİ: URL'den zorluk seviyesini oku
    const urlParams = new URLSearchParams(window.location.search);
    const difficultyParam = urlParams.get('difficulty');
    if (['easy', 'hard', 'pro'].includes(difficultyParam)) {
        this.difficulty = difficultyParam;
    }
    console.log(`Game starting with difficulty: ${this.difficulty}`);
    // BİTTİ
    this.loadAllImages();
    this.imageManager.onAllLoaded = () => {
        this.imagesLoaded = true; 
        this.generateMap(); 
        this.createUnits();
        this.setupEvents(); 
        this.centerOnHometown(); 
        // YENİ: Müzik sistemini başlat
        this.initMusicPlayer();
        this.gameLoop(); 
        this.updateUI();
        // YENİ: Kar yağışını başlat
        this.createSnowfall();
         // YENİ: Oyun yüklendiğinde pop-up'ı göster
        this.showWelcomePopup();
    };
};

// =======================================================================
// YENİ BÖLÜM: BAŞLANGIÇ BİLGİLENDİRME POP-UP'I
// =======================================================================
Game.prototype.showWelcomePopup = function() {
    // Eğer pop-up zaten varsa, tekrar oluşturma
    if (document.getElementById('info-popup-overlay')) return;

    // Ana arkaplan div'ini oluştur
    const overlay = document.createElement('div');
    overlay.id = 'info-popup-overlay';

    // İçerik kutusunu oluştur
    const box = document.createElement('div');
    box.id = 'info-popup-box';

    box.innerHTML = `
        <h2>Welcome to this world!</h2>
        <p>Your goal is to build an army and defeat the enemy <strong>King</strong>!</p>
        
        <h4>Controls & Gameplay:</h4>
        <ul>
            <li>- Use <strong>WASD</strong> keys to move the camera around the map.</li>
            <li>- Produce <strong>Workers</strong> to gather resources automatically each turn.</li>
            <!-- YENİ EKLENEN BİLGİ SATIRI -->
            <li>- <strong>Each Worker</strong> provides +10 Wood, +10 Stone, +5 Meat, +10 Grain, +3 Gold, +3 Fish per turn.</li>
            <li>- Use your resources to build a powerful army based on <strong>chess pieces</strong>.</li>
            <li>- Click the <strong>End Turn</strong> button to finish your turn and let the AI play.</li>
        </ul>

        <h4>Unit Movements:</h4>
        <ul>
            <li><strong>Pawn:</strong> Moves one step forward, attacks diagonally.</li>
            <li><strong>Rook:</strong> Moves in straight lines, horizontally or vertically.</li>
            <li><strong>Bishop:</strong> Moves in diagonal lines.</li>
            <li><strong>Knight:</strong> Moves in an "L" shape (2+1 squares) and can jump over units.</li>
            <li><strong>Queen:</strong> The most powerful piece, combines Rook and Bishop movements.</li>
            <li><strong>King:</strong> Your main base. If it's destroyed, you lose! Long Live The King!</li>
        </ul>

        <button id="close-popup-btn">Got It, Let's Play!</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Kapatma butonuna tıklama olayını ekle
    document.getElementById('close-popup-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
};

// YENİ FONKSİYON: Müzik Çaları Başlatma
// Bu fonksiyonu init fonksiyonunun altına ekleyin
Game.prototype.initMusicPlayer = function() {
    const volumeSlider = document.getElementById('volume-slider');
    
    // Ses ayarı
    this.audioElement.volume = volumeSlider.value;
    volumeSlider.addEventListener('input', (e) => {
        this.audioElement.volume = e.target.value;
    });

    // Sıradaki şarkıya geçme
    this.audioElement.addEventListener('ended', () => {
        this.playNextTrack();
    });

    // İlk şarkıyı çal
    this.playNextTrack();
};

// YENİ FONKSİYON: Sıradaki Şarkıyı Çalma
Game.prototype.playNextTrack = function() {
    if (this.musicPlaylist.length === 0) return;
    
    this.audioElement.src = this.musicPlaylist[this.currentTrackIndex];
    this.audioElement.play().catch(e => console.error("Error playing audio:", e));
    
    document.getElementById('song-info').textContent = `Now Playing: ${this.musicPlaylist[this.currentTrackIndex]}`;
    
    // Bir sonraki şarkı için indeksi hazırla
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicPlaylist.length;
};

Game.prototype.gameLoop = function() { 
    this.render(); 
    requestAnimationFrame(() => this.gameLoop()); 
};

// WIN/LOSS DETECTION
Game.prototype.checkWinCondition = function() {
    const humanKing = this.units.find(u => u.owner === 'human' && u.type === 'king');
    const aiKing = this.units.find(u => u.owner === 'ai' && u.type === 'king');
    
    if (!humanKing) {
        this.gameState = 'ai_won';
        this.showGameOverScreen('AI Wins!', 'Your King has been defeated!');
        return true;
    }
    
    if (!aiKing) {
        this.gameState = 'human_won';
        this.showGameOverScreen('You Win!', 'Enemy King has been defeated!');
        return true;
    }
    
    return false;
};

Game.prototype.showGameOverScreen = function(title, message) {
    // Create game over overlay
    const overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    const gameOverBox = document.createElement('div');
    gameOverBox.style.cssText = `
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: #ecf0f1;
        padding: 40px;
        border-radius: 15px;
        text-align: center;
        border: 3px solid #3498db;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        max-width: 400px;
    `;
    
    gameOverBox.innerHTML = `
        <h1 style="color: ${this.gameState === 'human_won' ? '#2ecc71' : '#e74c3c'}; margin-bottom: 20px; font-size: 36px;">${title}</h1>
        <p style="font-size: 18px; margin-bottom: 30px;">${message}</p>
        <button id="restartGame" style="
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-right: 10px;
        ">Play Again</button>
        <button id="closeGame" style="
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        ">Close</button>
    `;
    
    overlay.appendChild(gameOverBox);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('restartGame').addEventListener('click', () => {
        document.body.removeChild(overlay);
        this.restartGame();
    });
    
    document.getElementById('closeGame').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
};

Game.prototype.restartGame = function() {
    // Reset game state
    this.gameState = 'playing';
    this.currentPlayer = 'human';
    this.turn = 1;
    this.selectedUnit = null;
    this.possibleMoves = [];
    
    // Reset resources
    this.humanResources = new ResourceManager();
    this.aiResources = new ResourceManager();
    
    // Regenerate map and units
    this.generateMap();
    this.createUnits();
    this.centerOnHometown();
    this.updateUI();
    
    console.log('Game restarted!');
};

// RESOURCE AND TURN MANAGEMENT
Game.prototype.collectResources = function(owner) {
    const resourceManager = owner === 'human' ? this.humanResources : this.aiResources;
    const workers = this.units.filter(u => u.owner === owner && u.type === 'worker');
    
    workers.forEach(worker => {
        resourceManager.addResource('wood', 10);
        resourceManager.addResource('stone', 10);
        resourceManager.addResource('meat', 5);
        resourceManager.addResource('grain', 10);
        resourceManager.addResource('gold', 3);
        resourceManager.addResource('fish', 3);
    });

    console.log(`${owner} collected resources. Workers: ${workers.length}`);
    this.updateUI();
};

Game.prototype.endTurn = function() {
    if (this.gameState !== 'playing') return;
    
    this.deselectUnit();
    if (this.currentPlayer === 'human') {
        this.collectResources('human');
        this.currentPlayer = 'ai';
        this.updateUI();
        console.log("AI's Turn");
        setTimeout(() => this.processAITurn(), 500);
    } else {
        this.collectResources('ai');
        this.currentPlayer = 'human';
        this.turn++;
        this.units.forEach(u => u.resetTurn());
        this.updateUI();
        console.log(`Turn ${this.turn}: Your Turn`);
    }
};

// AI LOGIC
/*Game.prototype.processAITurn = function() {
    if (this.gameState !== 'playing') return;
    
    console.log("AI is thinking...");
    const aiUnits = this.units.filter(u => u.owner === 'ai' && u.type !== 'king'); // Exclude king from AI movement
    
    // Military units strategy
    aiUnits.filter(u => u.type !== 'worker').forEach(unit => {
        if (unit.hasActed) return;
        
        const moves = unit.getPossibleMoves();
        const attackMoves = moves.filter(m => m.type === 'attack');
        
        if (attackMoves.length > 0) {
            const randomAttack = attackMoves[Math.floor(Math.random() * attackMoves.length)];
            const targetUnit = this.getUnitAt(randomAttack.x, randomAttack.y);
            this.executeAttack(unit, targetUnit);
        } else if (moves.length > 0) {
            const humanUnits = this.units.filter(u => u.owner === 'human');
            if(humanUnits.length > 0) {
                let closestEnemy = humanUnits[0];
                let minDistance = Infinity;
                humanUnits.forEach(hu => {
                    const dist = Math.abs(hu.x - unit.x) + Math.abs(hu.y - unit.y);
                    if(dist < minDistance) {
                        minDistance = dist;
                        closestEnemy = hu;
                    }
                });

                let bestMove = moves[0];
                let bestMoveDist = Infinity;
                moves.forEach(move => {
                    const distToEnemy = Math.abs(move.x - closestEnemy.x) + Math.abs(move.y - closestEnemy.y);
                    if(distToEnemy < bestMoveDist) {
                        bestMoveDist = distToEnemy;
                        bestMove = move;
                    }
                });
                unit.moveTo(bestMove.x, bestMove.y);
            }
        }
    });

    // Worker movement
    aiUnits.filter(u => u.type === 'worker' && !u.hasActed).forEach(worker => {
        const moves = worker.getPossibleMoves();
        if(moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            worker.moveTo(randomMove.x, randomMove.y);
        }
    });

    // Unit production
    if (this.aiResources.canAfford({wood: 10})) {
        const workerCount = aiUnits.filter(u => u.type === 'worker').length;
        if(workerCount < 5) {
            this.buildingSystem.produceUnit('worker', 'ai');
        }
    }
    
    // Try to produce military units
    if (this.aiResources.canAfford({wood: 15, stone: 5})) {
        this.buildingSystem.produceUnit('pawn', 'ai');
    }
    
    this.endTurn();
};
*/
// =======================================================================
// EKSİKSİZ VE DÜZELTİLMİŞ YAPAY ZEKA MANTIĞI
// =======================================================================
Game.prototype.processAITurn = function() {
    if (this.gameState !== 'playing') return;
    
    console.log("AI is thinking...");
    const aiUnits = this.units.filter(u => u.owner === 'ai');
    const humanUnits = this.units.filter(u => u.owner === 'human');

    // 1. ÖNCE HAREKET ET, SONRA ÜRET
    // Bu, yeni üretilen birimlerin aynı turda hareket etmeye çalışmasını engeller.

    // Tüm AI birimleri için (asker ve işçi) hamle kararlarını ver
    aiUnits.forEach(unit => {
        if (unit.hasActed || unit.type === 'king') return; // Kral ve hamle yapmış birimler pas geçilir

        const moves = unit.getPossibleMoves();
        if (moves.length === 0) return; // Hareket edecek yer yoksa pas geç

        // İşçiler sadece rastgele hareket eder
        if (unit.type === 'worker') {
            const moveOnly = moves.filter(m => m.type === 'move');
            if (moveOnly.length > 0) {
                const randomMove = moveOnly[Math.floor(Math.random() * moveOnly.length)];
                unit.moveTo(randomMove.x, randomMove.y);
            }
            return; // İşçi hamlesini yaptı, devam etme.
        }

        // Askeri birimler için saldırı/yaklaşma mantığı
        const attackMoves = moves.filter(m => m.type === 'attack');
        
        // ÖNCELİK 1: SALDIRI
        if (attackMoves.length > 0) {
            const randomAttack = attackMoves[Math.floor(Math.random() * attackMoves.length)];
            const targetUnit = this.getUnitAt(randomAttack.x, randomAttack.y);
            if (targetUnit) {
                this.executeAttack(unit, targetUnit);
            }
            return; // Saldırı yapıldı, bu birim için işlem bitti.
        }
        
        // ÖNCELİK 2: HAREKET ETME
        // Saldıracak kimse yoksa, en yakın düşmana doğru hareket et.
        if (humanUnits.length > 0) {
            // En yakın düşmanı bul
            let closestEnemy = null;
            let minDistance = Infinity;

            humanUnits.forEach(hu => {
                const dist = Math.abs(hu.x - unit.x) + Math.abs(hu.y - unit.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = hu;
                }
            });

            if (!closestEnemy) return; // Düşman yoksa hareket etme.

            // En yakın düşmana yaklaştıracak en iyi hamleyi bul
            let bestMove = null;
            let bestMoveDist = Infinity;

            moves.forEach(move => {
                const distToEnemy = Math.abs(move.x - closestEnemy.x) + Math.abs(move.y - closestEnemy.y);
                if (distToEnemy < bestMoveDist) {
                    bestMoveDist = distToEnemy;
                    bestMove = move;
                }
            });

            // LOOP ENGELLEME MANTIĞI:
            // Eğer en iyi hamle bizi düşmana yaklaştırmıyorsa, rastgele bir hamle yap.
            if (bestMove && bestMoveDist >= minDistance) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                unit.moveTo(randomMove.x, randomMove.y);
                console.log(`AI ${unit.type} at (${unit.x},${unit.y}) was stuck, moving randomly.`);
            } else if (bestMove) {
                unit.moveTo(bestMove.x, bestMove.y);
            }
        }
    });

   /* // 2. ÜRETİM STRATEJİSİ (Hareketler bittikten sonra)
    const currentAiUnits = this.units.filter(u => u.owner === 'ai'); // Güncel birim listesini al
    const workerCount = currentAiUnits.filter(u => u.type === 'worker').length;
    const pawnCount = currentAiUnits.filter(u => u.type === 'pawn').length;
    // ... diğer birimlerin sayımı ...

    if (workerCount < 5) { this.buildingSystem.produceUnit('worker', 'ai'); }
    else if (pawnCount < 4) { this.buildingSystem.produceUnit('pawn', 'ai'); }
    // ... diğer üretim else if'leri ...
    
    console.log("AI finished its turn.");
    this.endTurn();
    */
   // 2. YENİ VE TIKANMAYAN ÜRETİM STRATEJİSİ
    // ==========================================================
    const workerCount = aiUnits.filter(u => u.type === 'worker').length;

    // Öncelik 1: Her zaman yeterli işçi olduğundan emin ol
    if (workerCount < 5) {
        this.buildingSystem.produceUnit('worker', 'ai');
    } 
    // Öncelik 2: Yeterli işçi varsa, askeri birim üretmeyi düşün
    else {
        // Üretilebilecek birimlerin bir listesini oluştur (en güçlüden en zayıfa)
        const possibleBuilds = ['queen', 'knight', 'rook', 'bishop', 'pawn'];
        let builtSomething = false;

        for (const unitType of possibleBuilds) {
            // Eğer bu birimi üretecek kaynağı varsa, üret ve döngüden çık
            if (this.buildingSystem.produceUnit(unitType, 'ai')) {
                builtSomething = true;
                break; 
            }
        }

        // Eğer hiçbir askeri birim üretilemediyse ve işçi sayısı 10'dan azsa, bir işçi daha üret
        if (!builtSomething && workerCount < 10) {
            this.buildingSystem.produceUnit('worker', 'ai');
        }
    }
    
    console.log("AI finished its turn.");
    this.endTurn();

};

// COMBAT SYSTEM
/*Game.prototype.executeAttack = function(attacker, defender) { 
    console.log(`${attacker.owner} ${attacker.type} attacks ${defender.owner} ${defender.type}`); 
    const defenderDestroyed = defender.takeDamage(50); 
    if (defenderDestroyed) {
        this.units = this.units.filter(u => u !== defender);
        
        // Check if a king was killed
        if (defender.type === 'king') {
            setTimeout(() => this.checkWinCondition(), 100);
        }
    }
    attacker.hasActed = true; 
};
*/
// =======================================================================
// YENİ SATRANÇ SAVAŞ SİSTEMİ
// =======================================================================
Game.prototype.executeAttack = function(attacker, defender) {
    // 1. Saldırı mesajını oluştur
    const attackerName = `${attacker.owner === 'human' ? 'Your' : 'Enemy'} ${attacker.type}`;
    const defenderName = `${defender.owner === 'human' ? 'your' : "enemy's"} ${defender.type}`;
    const message = `${attackerName} captures ${defenderName}!`;

    // 1. SES EFEKTİNİ ÇAL
    this.playSoundEffect('effect1.mp3');
    
    // Mesajın rengini belirle
    const color = attacker.owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
    
    // Hamle günlüğüne özel saldırı mesajını gönder
    this.logSpecialMessage(message, color);

    // 2. Savunan birimi oyundan kaldır
    this.units = this.units.filter(u => u !== defender);
    
    // 3. Saldıran birimi, alınan taşın yerine taşı
    attacker.moveTo(defender.x, defender.y);

    // 4. Kazanma koşulunu kontrol et (eğer bir kral alındıysa)
    if (defender.type === 'king') {
        setTimeout(() => this.checkWinCondition(), 100);
    }
};

// Continue with the rest of the original functions...
Game.prototype.loadAllImages = function() {
    const im = this.imageManager;
    ['grass', 'forest', 'mountain', 'water', 'plains', 'swamp'].forEach(t => im.loadImage(t, `tile_${t}.png`));
    im.loadImage('castle_human', 'castle_human.png'); 
    im.loadImage('castle_ai', 'castle_ai.png');
    im.loadImage('worker_human', 'unit_worker_human.png'); 
    im.loadImage('worker_ai', 'unit_worker_ai.png');
    im.loadImage('pawn_human', 'unit_pawn_human.png');
    im.loadImage('pawn_ai', 'unit_pawn_ai.png');
    im.loadImage('rook_human', 'unit_rook_human.png');
    im.loadImage('rook_ai', 'unit_rook_ai.png');
    im.loadImage('bishop_human', 'unit_bishop_human.png');
    im.loadImage('bishop_ai', 'unit_bishop_ai.png');
    im.loadImage('knight_human', 'unit_knight_human.png');
    im.loadImage('knight_ai', 'unit_knight_ai.png');
    im.loadImage('queen_human', 'unit_queen_human.png');
    im.loadImage('queen_ai', 'unit_queen_ai.png');
};

Game.prototype.generateMap = function() {
    this.map = Array.from({ length: this.mapWidth }, (_, x) => 
        Array.from({ length: this.mapHeight }, (_, y) => this.generateTile(x, y)));
};

/*Game.prototype.generateTile = function(x, y) {
    const name = this.getTileName(x, y);
    //const noise = this.simpleNoise(x * 0.1, y * 0.1);
    const noise = this.simpleNoise(x * 0.04, y * 0.04);
    const waterNoise = this.simpleNoise(x * 0.05, y * 0.05);
    let terrain = 'grass', resource = null, amount = 0;
    
    if (waterNoise < -0.4) { 
        terrain = 'water'; 
    } else if (noise > 0.7) { 
        terrain = 'mountain'; 
        if (Math.random() > 0.6) { resource = 'stone'; amount = 2500; } 
    } else if (noise > 0.4) { 
        terrain = 'forest'; 
        if (Math.random() > 0.5) { resource = 'wood'; amount = 1000; } 
    } else if (noise > 0.1) {
        terrain = 'plains';
        if (Math.random() > 0.7) { resource = 'grain'; amount = 800; }
    } else if (noise < -0.2) {
        terrain = 'swamp';
        if (Math.random() > 0.8) { resource = 'fish'; amount = 600; }
    }
    
    return new Tile(x, y, name, terrain, resource, amount);
};*/
// =======================================================================
// MİNİMAL HARİTA ÜRETİM DÜZELTMESİ
// =======================================================================

// =======================================================================
// MİNİMAL HARİTA ÜRETİM DÜZELTMESİ - DAHA AZ SU VE DAĞ
// =======================================================================

Game.prototype.generateTile = function(x, y) {
    const name = this.getTileName(x, y);

    const noise = this.simpleNoise(x * 0.04, y * 0.04);
    const waterNoise = noise; 

    let terrain = 'grass', resource = null, amount = 0;
    
    // --- DEĞİŞİKLİK BURADA ---
    // Su ve Dağ eşiklerini daha zorlu hale getiriyoruz.
    // -1'e daha yakın ve +1'e daha yakın değerler seçiyoruz.

    if (waterNoise < -0.8) { // ESKİSİ: -0.5 -> YENİSİ: -0.8 (Çok daha nadir su)
        terrain = 'water'; 
        if (Math.random() > 0.7) { resource = 'fish'; amount = 1500; } 
    } else if (noise > 0.95) { // ESKİSİ: 0.6 -> YENİSİ: 0.8 (Çok daha nadir dağ)
        terrain = 'mountain'; 
        if (Math.random() > 0.6) { resource = 'stone'; amount = 2500; } 
    } else if (noise > 0.3) { 
        terrain = 'forest'; 
        if (Math.random() > 0.5) { resource = 'wood'; amount = 1000; } 
    } else if (noise > 0.0) {
        terrain = 'plains';
        if (Math.random() > 0.7) { resource = 'grain'; amount = 800; }
    } else if (noise < -0.3) {
        terrain = 'swamp';
        if (Math.random() > 0.8) { resource = 'meat'; amount = 600; }
    }
    
    return new Tile(x, y, name, terrain, resource, amount);
};

Game.prototype.simpleNoise = function(x, y) { 
    const s = Math.sin(x*12.9898+y*78.233)*43758.5453; 
    return (s-Math.floor(s))*2-1; 
};

Game.prototype.createUnits = function() {
    this.units = [];
    const hx = Math.floor(this.mapWidth / 2), hy = this.mapHeight - 5;
    const ax = Math.floor(this.mapWidth / 2), ay = 4;
    
    // Create Kings (fixed position)
    this.units.push(new King(hx, hy, 'human', this));
    this.units.push(new King(ax, ay, 'ai', this));
    
    // Create initial workers
    this.units.push(new Worker(hx - 1, hy - 1, 'human', this));
    this.units.push(new Worker(hx + 1, hy - 1, 'human', this));
    this.units.push(new Worker(ax - 1, ay + 1, 'ai', this));
    this.units.push(new Worker(ax + 1, ay + 1, 'ai', this));
// ==========================================================
    // YENİ: ZORLUK SEVİYESİNE GÖRE AI'A BONUS BİRİMLER VER
    // ==========================================================
    let bonusUnits = {};
    if (this.difficulty === 'hard') {
        bonusUnits = { bishop: 2, rook: 2, knight: 2, queen: 1 };
    } else if (this.difficulty === 'pro') {
        bonusUnits = { bishop: 6, rook: 6, knight: 6, queen: 4 };
    }
    
    // Bonus birimleri kralın etrafına yerleştir
    Object.keys(bonusUnits).forEach(unitType => {
        for (let i = 0; i < bonusUnits[unitType]; i++) {
            const spawnLoc = this.buildingSystem.findSpawnLocation(ax, ay);
            if (spawnLoc) {
                let newUnit;
                switch (unitType) {
                    case 'bishop': newUnit = new Bishop(spawnLoc.x, spawnLoc.y, 'ai', this); break;
                    case 'rook': newUnit = new Rook(spawnLoc.x, spawnLoc.y, 'ai', this); break;
                    case 'knight': newUnit = new Knight(spawnLoc.x, spawnLoc.y, 'ai', this); break;
                    case 'queen': newUnit = new Queen(spawnLoc.x, spawnLoc.y, 'ai', this); break;
                }
                if (newUnit) this.units.push(newUnit);
            }
        }
    });
};

// Continue with render and other functions from the original code...
Game.prototype.render = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#2c3e50'; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.imagesLoaded) { 
        this.ctx.fillStyle = '#ffffff'; 
        this.ctx.font = '24px Arial'; 
        this.ctx.textAlign = 'center'; 
        this.ctx.fillText('Loading Assets...', this.canvas.width / 2, this.canvas.height / 2); 
        return; 
    }
    
    // Render tiles
    for (let y = 0; y < this.mapHeight; y++) { 
        for (let x = 0; x < this.mapWidth; x++) { 
            const tile = this.map[x][y];
            const screenPos = this.tileToScreen(x, y); 
            if (screenPos.x > -this.tileSize.width && screenPos.x < this.canvas.width && 
                screenPos.y > -this.tileSize.height && screenPos.y < this.canvas.height + this.tileSize.height) { 
                const image = this.imageManager.getImage(tile.terrainType); 
                if (image && image.complete && image.naturalWidth > 0) 
                    this.ctx.drawImage(image, screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
            }
        }
    }
    
    // Render possible moves
    this.possibleMoves.forEach(move => { 
        const screenPos = this.tileToScreen(move.x, move.y); 
        this.ctx.fillStyle = move.type === 'attack' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(46, 204, 113, 0.5)'; 
        this.drawIsometricTile(screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
    });
    
    // Render units
    this.units.sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(unit => { 
        const screenPos = this.tileToScreen(unit.x, unit.y); 
        let imageName = unit.type === 'king' ? `castle_${unit.owner}` : `${unit.type}_${unit.owner}`; 
        const image = this.imageManager.getImage(imageName); 
        if (image && image.complete && image.naturalWidth > 0) 
            this.ctx.drawImage(image, screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
    });
    
    // Render selection highlight
    if (this.selectedUnit) { 
        const screenPos = this.tileToScreen(this.selectedUnit.x, this.selectedUnit.y); 
        this.ctx.strokeStyle = '#f39c12'; 
        this.ctx.lineWidth = 2; 
        this.drawIsometricTileOutline(screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
    }
    
    // Render hover highlight
    if (this.hoveredTile) { 
        const screenPos = this.tileToScreen(this.hoveredTile.x, this.hoveredTile.y); 
        this.ctx.strokeStyle = "rgba(255, 255, 0, 0.8)"; 
        this.ctx.lineWidth = 2; 
        this.drawIsometricTileOutline(screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
    }
    // ==========================================================
    // YENİ: Kar Efektini En Üste Çiz
    // ==========================================================
    this.updateAndDrawSnow();

    // YENİ: Hamle günlüğü mesajlarını çiz
    this.drawMoveLog();
};

Game.prototype.drawMoveLog = function() {
    const currentTime = Date.now();
    const messageLifetime = 3000; // Mesajın ekranda kalma süresi (3 saniye)
    const fadeDuration = 500; // Solma animasyonu süresi (0.5 saniye)
    
    // Aktif mesajları filtrele
    this.moveLogMessages = this.moveLogMessages.filter(msg => 
        currentTime - msg.creationTime < messageLifetime
    );

    //const startY = this.canvas.height - 30; // Başlangıç Y pozisyonu (ekranın altı)
    //const lineHeight = 20;
    // --- DEĞİŞİKLİK BURADA ---
    const startX = 20; // Sol kenardan boşluk
    const startY = 30; // Üst kenardan başlangıç pozisyonu
    const lineHeight = 20; // Satır yüksekliği

    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'left';

    this.moveLogMessages.forEach((msg, index) => {
        const age = currentTime - msg.creationTime;
        let opacity = 1.0;

        // Mesajın son anlarında solma efekti uygula
        if (age > messageLifetime - fadeDuration) {
            opacity = 1.0 - (age - (messageLifetime - fadeDuration)) / fadeDuration;
        }

        const [r, g, b] = msg.color.match(/\d+/g); // Renk bileşenlerini al
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        
        //this.ctx.fillText(msg.text, this.canvas.width - 20, startY - (index * lineHeight));
        // Yazıyı ekranın solundan 20 piksel içeride başlat
       // this.ctx.fillText(msg.text, 20, startY - (index * lineHeight));
       // --- DEĞİŞİKLİK BURADA ---
        // Yazıyı sol üstten başlayarak aşağı doğru sırala
        this.ctx.fillText(msg.text, startX, startY + (index * lineHeight));
    });
};

// --- YENİ KAR YAĞIŞI FONKSİYONLARI ---

// Belirlenen sayıda kar tanesi oluşturur
Game.prototype.createSnowfall = function(count = 150) {
    if (!this.isSnowing) return;
    this.snowflakes = [];
    for (let i = 0; i < count; i++) {
        this.snowflakes.push(new Snowflake(this.canvas.width, this.canvas.height));
    }
};

// Kar tanelerinin pozisyonlarını günceller ve çizer
// Bu, ana render fonksiyonu içinde çağrılacak
Game.prototype.updateAndDrawSnow = function() {
    if (!this.isSnowing) return;
    
    this.snowflakes.forEach(snowflake => {
        snowflake.update();
        snowflake.draw(this.ctx);
    });
};

Game.prototype.drawIsometricTile = function(x,y,w,h) { 
    this.ctx.beginPath(); 
    this.ctx.moveTo(x + w / 2, y); 
    this.ctx.lineTo(x + w, y + h / 2); 
    this.ctx.lineTo(x + w / 2, y + h); 
    this.ctx.lineTo(x, y + h / 2); 
    this.ctx.closePath(); 
    this.ctx.fill(); 
};

Game.prototype.drawIsometricTileOutline = function(x,y,w,h) { 
    this.ctx.beginPath(); 
    this.ctx.moveTo(x + w / 2, y); 
    this.ctx.lineTo(x + w, y + h / 2); 
    this.ctx.lineTo(x + w / 2, y + h); 
    this.ctx.lineTo(x, y + h / 2); 
    this.ctx.closePath(); 
    this.ctx.stroke(); 
};

// =======================================================================
// YENİ BÖLÜM: HAMLE GÜNLÜĞÜ SİSTEMİ
// =======================================================================

// logMove fonksiyonunu bulun ve güncelleyin
Game.prototype.logMove = function(unit, from, to) {
    const fromName = this.getTileName(from.x, from.y);
    const toName = this.getTileName(to.x, to.y);
    const text = `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} ${fromName} -> ${toName}`;
    const color = unit.owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
    this.logSpecialMessage(text, color); // Artık bu da özel mesaj fonksiyonunu kullanıyor
};

// YENİ: Özel metinleri günlüğe ekleyen fonksiyon
Game.prototype.logSpecialMessage = function(text, color) {
    const message = {
        text: text,
        color: color,
        creationTime: Date.now()
    };
    this.moveLogMessages.push(message);
    if (this.moveLogMessages.length > 5) {
        this.moveLogMessages.shift();
    }
};

// =======================================================================
// YENİ SES EFEKTİ FONKSİYONU
// =======================================================================
Game.prototype.playSoundEffect = function(soundFile) {
    // Her seferinde yeni bir Audio nesnesi oluşturmak,
    // seslerin üst üste binmesine ve kesilmeden çalmasına olanak tanır.
    const audio = new Audio(soundFile);
    audio.volume = 0.5; // Ses seviyesini ayarla (0.0 ile 1.0 arası)
    audio.play().catch(e => console.error("Sound effect failed to play:", e));
};

// drawMoveLog fonksiyonu aynı kalabilir, bir değişiklik gerekmez.

Game.prototype.setupEvents = function() {
    document.addEventListener('keydown', (e) => { 
        const speed = this.cameraSpeed; 
        switch(e.key.toLowerCase()) { 
            case 'w': this.camera.y -= speed; break; 
            case 's': this.camera.y += speed; break; 
            case 'a': this.camera.x -= speed; break; 
            case 'd': this.camera.x += speed; break; 
            case 'escape': this.deselectUnit(); break; 
        } 
    });
    
    this.canvas.addEventListener('mousemove', (e) => { 
        const rect = this.canvas.getBoundingClientRect(); 
        const scaleX = this.canvas.width / rect.width; 
        const scaleY = this.canvas.height / rect.height; 
        const screenX = (e.clientX - rect.left) * scaleX; 
        const screenY = (e.clientY - rect.top) * scaleY; 
        const worldCoords = this.screenToWorld(screenX, screenY); 
        this.hoveredTile = this.worldToTile(worldCoords.x, worldCoords.y); 
    });
    
    this.canvas.addEventListener('click', (e) => { 
        if (this.hoveredTile) this.handleTileClick(this.hoveredTile.x, this.hoveredTile.y); 
    });
    // "Game Tutorial" butonu showWelcomePopup fonksiyonunu çağırır.
    document.getElementById('showTutorial').addEventListener('click', () => this.showWelcomePopup());

    document.getElementById('endTurn').addEventListener('click', () => this.endTurn());

    
    // Unit production buttons
    document.getElementById('produceWorker').addEventListener('click', () => this.buildingSystem.produceUnit('worker', 'human'));
    document.getElementById('producePawn').addEventListener('click', () => this.buildingSystem.produceUnit('pawn', 'human'));
    document.getElementById('produceRook').addEventListener('click', () => this.buildingSystem.produceUnit('rook', 'human'));
    document.getElementById('produceBishop').addEventListener('click', () => this.buildingSystem.produceUnit('bishop', 'human'));
    document.getElementById('produceKnight').addEventListener('click', () => this.buildingSystem.produceUnit('knight', 'human'));
    document.getElementById('produceQueen').addEventListener('click', () => this.buildingSystem.produceUnit('queen', 'human'));
};

/*Game.prototype.handleTileClick = function(x, y) {
    if (this.currentPlayer !== 'human' || this.gameState !== 'playing') return;
    
    const unitOnTile = this.getUnitAt(x, y);
    if (this.selectedUnit) {
        const move = this.possibleMoves.find(m => m.x === x && m.y === y);
        if (move) { 
            if (move.type === 'attack') 
                this.executeAttack(this.selectedUnit, unitOnTile); 
            else 
                this.selectedUnit.moveTo(x, y); 
            this.deselectUnit(); 
        } else { 
            this.deselectUnit(); 
            if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed && unitOnTile.type !== 'king') 
                this.selectUnit(unitOnTile); 
        }
    } else if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed && unitOnTile.type !== 'king') { 
        this.selectUnit(unitOnTile); 
    }
};
*/
// handleTileClick fonksiyonunu bulun ve bu daha basit versiyonla değiştirin

Game.prototype.handleTileClick = function(x, y) {
    if (this.currentPlayer !== 'human' || this.gameState !== 'playing') return;
    
    const unitOnTile = this.getUnitAt(x, y);

    // Seçili birim varken bir hamle yapılıyor
    if (this.selectedUnit) {
        const move = this.possibleMoves.find(m => m.x === x && m.y === y);
        if (move) { 
            if (move.type === 'attack') {
                this.executeAttack(this.selectedUnit, unitOnTile); 
            } else {
                this.selectedUnit.moveTo(x, y); 
            }
            this.deselectUnit(); 
        } else { 
            // Geçersiz bir hamle yapıldı, seçimi iptal et ve belki yeni birim seç
            this.deselectUnit(); 
            if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed) {
                this.selectUnit(unitOnTile); 
            }
        }
    } 
    // Hiçbir birim seçili değilken tıklanıyor
    else if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed) {
        // Tıklanan birim hareket edebiliyorsa seç (artık Kral da dahil)
        this.selectUnit(unitOnTile); 
    }
};

Game.prototype.selectUnit = function(unit) { 
    this.deselectUnit(); 
    this.selectedUnit = unit; 
    this.possibleMoves = unit.getPossibleMoves(); 
};

Game.prototype.deselectUnit = function() { 
    this.selectedUnit = null; 
    this.possibleMoves = []; 
};

Game.prototype.updateUI = function() {
    document.getElementById('turnDisplay').textContent = `Turn: ${this.turn} (${this.currentPlayer.toUpperCase()})`;
    const res = this.humanResources.resources;
    Object.keys(res).forEach(type => {
        const el = document.getElementById(type);
        if (el) el.textContent = res[type];
    });

    document.querySelectorAll('#unitButtons .unit-btn').forEach(button => {
        const unitType = button.id.replace('produce', '').toLowerCase();
        const cost = this.buildingSystem.unitCosts[unitType];
        
        if (cost) {
            button.disabled = !this.humanResources.canAfford(cost) || this.currentPlayer !== 'human' || this.gameState !== 'playing';
        } else {
            button.disabled = true;
        }
    });
    
    // Disable end turn button if not human turn or game over
    document.getElementById('endTurn').disabled = this.currentPlayer !== 'human' || this.gameState !== 'playing';
};

Game.prototype.isValidTile = function(x, y) { 
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight; 
};

Game.prototype.getUnitAt = function(x, y) { 
    return this.units.find(u => u.x === x && u.y === y); 
};

Game.prototype.centerOnHometown = function() { 
    const king = this.units.find(u => u.owner === 'human' && u.type === 'king'); 
    if (king) { 
        const worldPos = this.tileToWorld(king.x, king.y); 
        this.camera.x = worldPos.x; 
        this.camera.y = worldPos.y; 
    }
};

Game.prototype.getTileTargetInfo = function(x, y, attackerOwner) {
    if (!this.isValidTile(x,y)) return {isValid: false}; 
    const tile = this.map[x][y];
    if (!tile.canWalkOn()) return {isValid: false}; 
    const unitOnTile = this.getUnitAt(x, y);
    if (unitOnTile) { 
        return { isValid: unitOnTile.owner !== attackerOwner, type: 'attack' }; 
    }
    return { isValid: true, type: 'move' };
};

Game.prototype.getTileName = function(x, y) { 
    return String.fromCharCode(97 + x) + (y + 1); 
};

Game.prototype.tileToWorld = function(tileX, tileY) { 
    return { x: (tileX - tileY) * (this.tileSize.width / 2), y: (tileX + tileY) * (this.tileSize.height / 2) }; 
};

Game.prototype.tileToScreen = function(tileX, tileY) { 
    const worldPos = this.tileToWorld(tileX, tileY); 
    return { x: worldPos.x - this.camera.x + this.canvas.width / 2, y: worldPos.y - this.camera.y + this.canvas.height / 2 }; 
};

Game.prototype.screenToWorld = function(screenX, screenY) { 
    return { x: screenX - this.canvas.width / 2 + this.camera.x, y: screenY - this.canvas.height / 2 + this.camera.y }; 
};

/*Game.prototype.worldToTile = function(worldX, worldY) {
    const tileX = Math.round((worldX / (this.tileSize.width / 2) + worldY / (this.tileSize.height / 2)) / 2);
    const tileY = Math.round((worldY / (this.tileSize.height / 2) - worldX / (this.tileSize.width / 2)) / 2);
    if (this.isValidTile(tileX, tileY)) return { x: tileX, y: tileY };
    return null;
};
*/
// =======================================================================
// KOORDİNAT SİSTEMİ - YARIM KARO OFSET DÜZELTMESİ
// =======================================================================
Game.prototype.worldToTile = function(worldX, worldY) {
    const halfTileWidth = this.tileSize.width / 2;
    const halfTileHeight = this.tileSize.height / 2;

    // Orijinal formülünüz
    const term1 = worldX / halfTileWidth;
    const term2 = worldY / halfTileHeight;

    // --- DEĞİŞİKLİK BURADA ---
    // Sonucu yuvarlamadan önce "yarım karo" (0.5) kadar geri kaydırıyoruz.
    // Bu, yuvarlama işleminin doğru karoyu seçmesini sağlar.
    const tileX = Math.round((term1 + term2) / 2 - 0.5);
    const tileY = Math.round((term2 - term1) / 2);
    // -------------------------

    if (this.isValidTile(tileX, tileY)) {
        return { x: tileX, y: tileY };
    }
    return null;
};

// =======================================================================
// NİHAİ KOORDİNAT FONKSİYONLARI (TIKLAMA KAYMASI DÜZELTİLDİ)
// =======================================================================

// ... diğer koordinat fonksiyonları (tileToWorld, tileToScreen, screenToWorld) aynı kalabilir ...

