// =======================================================================
// ENHANCED CHESS STRATEGY GAME - WITH BUILDING SYSTEM
// =======================================================================
console.log("Loading enhanced chess strategy game with building system...");

let game = null;

class ImageManager {
    constructor() { 
        this.images = {}; 
        this.loadedCount = 0; 
        this.totalImages = 0; 
        this.onAllLoaded = null; 
        // Water animation frames
        this.waterFrames = [];
        this.waterAnimationSpeed = 8;
        this.currentWaterFrame = 0;
        this.lastWaterFrameTime = 0;
        // YENİ: İnsan İşçi Animasyon Değişkenleri
        this.workerHumanFrames = [];
        this.workerHumanAnimationSpeed = 5; // Hızı biraz daha yavaş yapalım (saniyede 5 kare)
        this.currentWorkerHumanFrame = 0;
        this.lastWorkerHumanFrameTime = 0;

        // YENİ: AI İşçi Animasyon Değişkenleri
        this.workerAiFrames = [];
        this.workerAiAnimationSpeed = 5;
        this.currentWorkerAiFrame = 0;
        this.lastWorkerAiFrameTime = 0;
    }
    
    loadImage(name, path) { 
        this.totalImages++; 
        const img = new Image(); 
        img.onload = () => this._imageLoaded(); 
        img.onerror = () => { console.error(`Failed to load: ${path}`); this._imageLoaded(); }; 
        img.src = path; 
        this.images[name] = img; 
    }
    
    loadWaterFrames() {
        for (let i = 1; i <= 16; i++) {
            this.loadImage(`water_frame_${i}`, `tile_water${i}.png`);
            this.waterFrames.push(`water_frame_${i}`);
        }
    }
    
    getCurrentWaterFrame() {
        const currentTime = Date.now();
        if (currentTime - this.lastWaterFrameTime > 1000 / this.waterAnimationSpeed) {
            this.currentWaterFrame = (this.currentWaterFrame + 1) % this.waterFrames.length;
            this.lastWaterFrameTime = currentTime;
        }
        return this.images[this.waterFrames[this.currentWaterFrame]];
    }

    // ImageManager class'ının içine bu yeni fonksiyonları ekleyin

    // YENİ: İnsan İşçi karelerini yüklemek için
    loadWorkerHumanFrames() {
        for (let i = 1; i <= 5; i++) {
            this.loadImage(`worker_human_frame_${i}`, `unit_worker_human${i}.png`);
            this.workerHumanFrames.push(`worker_human_frame_${i}`);
        }
    }

    // YENİ: AI İşçi karelerini yüklemek için
    loadWorkerAiFrames() {
        for (let i = 1; i <= 5; i++) {
            this.loadImage(`worker_ai_frame_${i}`, `unit_worker_ai${i}.png`);
            this.workerAiFrames.push(`worker_ai_frame_${i}`);
        }
    }

    // YENİ: Mevcut insan işçi karesini almak için
    getCurrentWorkerHumanFrame() {
        const currentTime = Date.now();
        if (currentTime - this.lastWorkerHumanFrameTime > 1000 / this.workerHumanAnimationSpeed) {
            this.currentWorkerHumanFrame = (this.currentWorkerHumanFrame + 1) % this.workerHumanFrames.length;
            this.lastWorkerHumanFrameTime = currentTime;
        }
        return this.images[this.workerHumanFrames[this.currentWorkerHumanFrame]];
    }

    // YENİ: Mevcut AI işçi karesini almak için
    getCurrentWorkerAiFrame() {
        const currentTime = Date.now();
        if (currentTime - this.lastWorkerAiFrameTime > 1000 / this.workerAiAnimationSpeed) {
            this.currentWorkerAiFrame = (this.currentWorkerAiFrame + 1) % this.workerAiFrames.length;
            this.lastWorkerAiFrameTime = currentTime;
        }
        return this.images[this.workerAiFrames[this.currentWorkerAiFrame]];
    }
    
    _imageLoaded() { 
        this.loadedCount++; 
        if (this.loadedCount === this.totalImages && this.onAllLoaded) this.onAllLoaded(); 
    }
    
    getImage(name) { 
        return this.images[name]; 
    }
}

// =======================================================================
// NEW: BUILDING SYSTEM
// =======================================================================
class Building {
    constructor(x, y, type, owner, game) {
        this.x = x; // Top-left corner
        this.y = y; // Top-left corner
        this.type = type; // 'house', 'blacksmith', 'church', 'palace'
        this.owner = owner; // 'human' or 'ai'
        this.game = game;
        this.isConstructed = false;
        this.constructionProgress = 0;
        this.constructionTime = 100; // frames to complete construction
        this.smokeParticles = [];
        
        // Building properties
        this.properties = this.getBuildingProperties();
    }
    
    getBuildingProperties() {
        const properties = {
            house: {
                housingCapacity: 8,
                description: "Houses 8 units (Workers and Pawns)"
            },
            blacksmith: {
                enablesUnits: ['rook', 'knight'],
                description: "Enables Rook and Knight production"
            },
            church: {
                enablesUnits: ['bishop'],
                description: "Enables Bishop production"
            },
            palace: {
                enablesUnits: ['queen'],
                description: "Enables Queen production"
            }
        };
        return properties[this.type] || {};
    }
    
    // Check if building occupies a specific tile
    occupiesTile(x, y) {
        return x >= this.x && x < this.x + 2 && y >= this.y && y < this.y + 2;
    }
    
    // Get all tiles occupied by this building
    getOccupiedTiles() {
        const tiles = [];
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                tiles.push({ x: this.x + dx, y: this.y + dy });
            }
        }
        return tiles;
    }
    
    // Update construction progress
    update() {
        if (!this.isConstructed) {
            this.constructionProgress++;
            if (this.constructionProgress >= this.constructionTime) {
                this.isConstructed = true;
                this.game.logSpecialMessage(`${this.type.charAt(0).toUpperCase() + this.type.slice(1)} construction completed!`, 
                    this.owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)');
            } else {
                // Add smoke particles during construction
                this.addSmokeParticle();
            }
        }
        
        // Update smoke particles
        this.updateSmokeParticles();
    }
    
    addSmokeParticle() {
        if (Math.random() < 0.3) { // 30% chance each frame
            const centerX = this.x + 1;
            const centerY = this.y + 1;
            this.smokeParticles.push({
                x: centerX + (Math.random() - 0.5) * 2,
                y: centerY + (Math.random() - 0.5) * 2,
                vx: (Math.random() - 0.5) * 0.1,
                vy: -Math.random() * 0.2 - 0.1,
                life: 60,
                maxLife: 60,
                size: Math.random() * 0.3 + 0.2
            });
        }
    }
    
    updateSmokeParticles() {
        this.smokeParticles = this.smokeParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0;
        });
    }
    
    renderSmokeParticles(ctx, game) {
        this.smokeParticles.forEach(particle => {
            const screenPos = game.tileToScreen(particle.x, particle.y);
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * game.tileSize.width;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#666666';
            ctx.beginPath();
            ctx.arc(screenPos.x + game.tileSize.width / 2, screenPos.y + game.tileSize.height / 2, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

// =======================================================================
// SNOW EFFECT
// =======================================================================
class Snowflake {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.reset();
    }

    reset() {
        this.x = Math.random() * this.canvasWidth;
        this.y = Math.random() * -this.canvasHeight;
        this.radius = Math.random() * 2 + 1;
        this.speedY = Math.random() * 1 + 0.5;
        this.speedX = Math.random() * 2 - 1;
        this.opacity = Math.random() * 0.5 + 0.3;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y > this.canvasHeight) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
    }
}

// =======================================================================
// TREASURE CHEST SYSTEM
// =======================================================================
class TreasureChest {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.isOpened = false;
        this.rewards = this.generateRewards();
    }
    
    generateRewards() {
        const rewardTypes = [ 'gold', 'wood', 'stone', 'meat', 'grain', 'fish'];
        const selectedReward = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
        const amount = 100 + Math.floor(Math.random() * 901); // 100-1000 arası
        const rewards = {};
        rewards[selectedReward] = amount;
        return rewards;
    }
    
    canBeOpenedBy(unit) {
        return unit.type === 'worker' && unit.owner === 'human';
    }
    
    open(unit) {
        if (this.isOpened || !this.canBeOpenedBy(unit)) {
            return false;
        }
        
        this.isOpened = true;
        
        Object.keys(this.rewards).forEach(resource => {
            this.game.humanResources.addResource(resource, this.rewards[resource]);
        });
        
        this.showChestDialog();
        
        const rewardText = Object.keys(this.rewards).map(res => 
            `+${this.rewards[res]} ${res}`
        ).join(', ');
        this.game.logSpecialMessage(`Treasure chest opened! Gained: ${rewardText}`, 'rgba(255, 215, 0, 0.9)');
        
        return true;
    }
    
    showChestDialog() {
        const existingDialog = document.getElementById('chest-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const dialogElement = document.createElement('div');
        dialogElement.id = 'chest-dialog';
        dialogElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #8B4513, #A0522D);
            color: #FFD700;
            padding: 30px;
            border-radius: 15px;
            border: 3px solid #FFD700;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 10000;
            min-width: 300px;
        `;
        
        const rewardText = Object.keys(this.rewards).map(res => 
            `+${this.rewards[res]} ${res.charAt(0).toUpperCase() + res.slice(1)}`
        ).join(', ');
        
        dialogElement.innerHTML = `
            <img src="chestImage.png" alt="Treasure Chest" style="width: 64px; height: 64px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 15px 0; color: #FFD700;">Treasure Chest Opened!</h3>
            <p style="margin: 0 0 15px 0; font-size: 16px;">Only workers can open treasure chests</p>
            <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold;">Reward: ${rewardText}</p>
            <button id="close-chest-dialog" style="
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #8B4513;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
            ">Continue</button>
        `;
        
        document.body.appendChild(dialogElement);
        
        const closeDialog = () => {
            if (dialogElement.parentNode) {
                dialogElement.parentNode.removeChild(dialogElement);
            }
        };
        
        document.getElementById('close-chest-dialog').addEventListener('click', closeDialog);
        setTimeout(closeDialog, 3000);
    }
}

window.addEventListener('load', () => { game = new Game(); game.init(); });

// =======================================================================
// FOG OF WAR
// =======================================================================
class FogOfWar {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: width }, () => Array(height).fill(0));
    }

    getState(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.grid[x][y];
    }

    update(units) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.grid[x][y] === 2) this.grid[x][y] = 1;
            }
        }

        const visionRadius = 6;
        units.forEach(unit => {
            if (unit.owner === 'human') {
                for (let dx = -visionRadius; dx <= visionRadius; dx++) {
                    for (let dy = -visionRadius; dy <= visionRadius; dy++) {
                        if (Math.sqrt(dx*dx + dy*dy) <= visionRadius) {
                            const x = unit.x + dx;
                            const y = unit.y + dy;
                            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                                this.grid[x][y] = 2;
                            }
                        }
                    }
                }
            }
        });
    }

    exploreArea(centerX, centerY, radius) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                 if (Math.sqrt(dx*dx + dy*dy) <= radius) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        if (this.grid[x][y] === 0) this.grid[x][y] = 1;
                    }
                }
            }
        }
    }
}

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
        this.hasActed = false; 
    }
    resetTurn() { this.hasActed = false; }
    getPossibleMoves() { return []; }
    moveTo(x, y) {
        const from = { x: this.x, y: this.y };
        this.x = x;
        this.y = y;
        this.hasActed = true;
        
        this.game.logMove(this, from, { x: x, y: y });
        if (this.owner === 'human') {
            this.game.fogOfWar.update(this.game.units, 'human');
        }
    }
}

class King extends Unit {
    constructor(x, y, owner, game) { 
        super(x, y, owner, 'king', game); 
    }
    
    getPossibleMoves() {
        const moves = [];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const newX = this.x + i;
                const newY = this.y + j;
                
                const targetInfo = this.game.getTileTargetInfo(newX, newY, this.owner);
                
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
        const direction = this.owner === 'human' ? -1 : 1;
        
        const forwardX = this.x;
        const forwardY = this.y + direction;
        const forwardInfo = this.game.getTileTargetInfo(forwardX, forwardY, this.owner);
        if (forwardInfo.isValid && forwardInfo.type === 'move') {
            moves.push({ x: forwardX, y: forwardY, type: 'move' });
        }
        
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
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
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
}

class Bishop extends Unit {
    constructor(x, y, owner, game) { super(x, y, owner, 'bishop', game); }
    getPossibleMoves() {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
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
}

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
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        
        for (let [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
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
            queen: { wood: 3000, meat: 1000, gold: 1000, stone: 1500, fish: 120 }
        };
        
        // NEW: Building costs (you can adjust these)
        this.buildingCosts = {
            house: { wood: 50, stone: 30, gold: 20 },
            blacksmith: { wood: 250, stone: 300, gold: 100 },
            church: { wood: 250, stone: 200, gold: 250 },
            palace: { wood: 1000, stone: 1000, gold: 500, meat: 1000 }
        };
    }
    
    // NEW: Check housing capacity
    getHousingInfo(owner) {
        const houses = this.game.buildings.filter(b => b.owner === owner && b.type === 'house' && b.isConstructed);
        const housingCapacity = houses.length * 8; // 8 units per house
        
        const populationUnits = this.game.units.filter(u => 
            u.owner === owner && (u.type === 'worker' || u.type === 'pawn')
        );
        const currentPopulation = populationUnits.length;
        
        return { currentPopulation, housingCapacity, availableHousing: housingCapacity - currentPopulation };
    }
    
    // NEW: Check if unit production is allowed based on housing
    canProduceUnit(unitType, owner) {
        if (unitType === 'worker' || unitType === 'pawn') {
            const housingInfo = this.getHousingInfo(owner);
            if (housingInfo.availableHousing <= 0) {
                return { allowed: false, reason: 'housing' };
            }
        }
        
        // Check building prerequisites
        const prerequisites = this.getUnitPrerequisites(unitType);
        if (prerequisites.length > 0) {
            const hasPrerequisites = prerequisites.every(buildingType => {
                return this.game.buildings.some(b => 
                    b.owner === owner && b.type === buildingType && b.isConstructed
                );
            });
            
            if (!hasPrerequisites) {
                return { allowed: false, reason: 'prerequisites', missing: prerequisites };
            }
        }
        
        return { allowed: true };
    }
    
    // NEW: Get unit prerequisites
    getUnitPrerequisites(unitType) {
        const prerequisites = {
            rook: ['blacksmith'],
            knight: ['blacksmith'],
            bishop: ['church'],
            queen: ['palace']
        };
        return prerequisites[unitType] || [];
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
        
        // NEW: Check housing and prerequisites
        const canProduce = this.canProduceUnit(unitType, owner);
        if (!canProduce.allowed) {
            if (canProduce.reason === 'housing' && owner === 'human') {
                this.showHousingRequiredDialog();
            } else if (canProduce.reason === 'prerequisites' && owner === 'human') {
                this.showPrerequisitesDialog(canProduce.missing);
            }
            return false;
        }
        
        const king = this.game.units.find(u => u.owner === owner && u.type === 'king');
        if (!king) {
            console.log(`No king found for ${owner}`);
            return false;
        }
        
        // Yukarıdaki kod bloğunu bu yeni versiyonla değiştirin:

let spawnLocation = this.findSpawnLocation(king.x, king.y, owner);

// EĞER İLK ARAMA BAŞARISIZ OLURSA VE BU BİR AI İSE, ACİL DURUM PLANINI DEVREYE SOK
if (!spawnLocation && owner === 'ai') {
    spawnLocation = this.findAnyAvailableSpawnLocation(owner);
}

// ARTIK SON KEZ KONTROL ET
if (!spawnLocation) {
    console.log(`No valid spawn location found for ${unitType} for ${owner}.`);
    // Sadece insan oyuncu için görünür bir mesaj gösterelim
    if (owner === 'human') {
        this.game.logSpecialMessage(
            `No valid spawn location found for ${unitType}`,
            'rgba(231, 76, 60, 0.9)'
        );
    }
    return false;
}
        
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
        
        const message = `Produced a ${unitType.charAt(0).toUpperCase() + unitType.slice(1)}`;
        const color = 'rgba(52, 152, 219, 0.9)';
        this.game.logSpecialMessage(message, color);
        
        console.log(`${owner} produced ${unitType} at (${spawnLocation.x}, ${spawnLocation.y})`);
        this.game.updateUI();
        return true;
    }
    
    // NEW: Build a building
    buildBuilding(buildingType, owner, x, y) {
        const cost = this.buildingCosts[buildingType];
        if (!cost) {
            console.log(`Unknown building type: ${buildingType}`);
            return false;
        }
        
        const resourceManager = owner === 'human' ? this.game.humanResources : this.game.aiResources;
        
        if (!resourceManager.canAfford(cost)) {
            console.log(`Not enough resources to build ${buildingType}`);
            return false;
        }
        
        // Check if location is valid for 2x2 building
        if (!this.canPlaceBuilding(x, y, owner)) {
            console.log(`Cannot place building at (${x}, ${y})`);
            return false;
        }
        
        resourceManager.spend(cost);
        
        const newBuilding = new Building(x, y, buildingType, owner, this.game);
        this.game.buildings.push(newBuilding);
        
        const message = `Started building ${buildingType.charAt(0).toUpperCase() + buildingType.slice(1)}`;
        const color = owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
        this.game.logSpecialMessage(message, color);
        
        console.log(`${owner} started building ${buildingType} at (${x}, ${y})`);
        this.game.updateUI();
        return true;
    }
    
    // NEW: Check if a 2x2 building can be placed at location
    canPlaceBuilding(x, y, owner) {
        // Check if all 4 tiles are valid and empty
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (!this.game.isValidTile(checkX, checkY)) return false;
                if (!this.game.map[checkX][checkY].canWalkOn()) return false;
                if (this.game.getUnitAt(checkX, checkY)) return false;
                if (this.game.getBuildingAt(checkX, checkY)) return false;
                if (this.game.getChestAt(checkX, checkY)) return false;
            }
        }
        return true;
    }
    
    // NEW: Find location for building near king
    findBuildingLocation(kingX, kingY, owner) {
        for (let radius = 2; radius <= 5; radius++) {
            for (let dx = -radius; dx <= radius - 1; dx++) { // -1 because building is 2x2
                for (let dy = -radius; dy <= radius - 1; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const x = kingX + dx;
                    const y = kingY + dy;
                    
                    if (this.canPlaceBuilding(x, y, owner)) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }
    
    findSpawnLocation(kingX, kingY, owner) {
        for (let radius = 1; radius <= 3; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const x = kingX + dx;
                    const y = kingY + dy;
                    
                    if (this.game.isValidTile(x, y) && 
                        this.game.map[x][y].canWalkOn() && 
                        !this.game.getUnitAt(x, y) &&
                        !this.game.getChestAt(x, y) &&
                        !this.game.getBuildingAt(x, y)) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }
// BuildingSystem sınıfının içine, findSpawnLocation'dan sonra bunu ekleyin:

findAnyAvailableSpawnLocation(owner) {
    console.log(`AI için harita genelinde boş yer aranıyor...`);
    // Bütün haritayı tara
    for (let y = 0; y < this.game.mapHeight; y++) {
        for (let x = 0; x < this.game.mapWidth; x++) {
            // Bir yerin boş olup olmadığını kontrol eden mevcut mantığı kullan
            if (this.game.isValidTile(x, y) && 
                this.game.map[x][y].canWalkOn() && 
                !this.game.getUnitAt(x, y) &&
                !this.game.getChestAt(x, y) &&
                !this.game.getBuildingAt(x, y)) {
                console.log(`AI için global arama başarılı: (${x}, ${y}) bulundu.`);
                return { x, y }; // İlk bulduğun boş yeri döndür
            }
        }
    }
    console.log(`AI için harita genelinde de boş yer bulunamadı.`);
    return null; // Bütün harita doluysa (çok nadir) null döndür.
}

    
    // NEW: Show housing required dialog
    showHousingRequiredDialog() {
        const existingDialog = document.getElementById('housing-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const dialogElement = document.createElement('div');
        dialogElement.id = 'housing-dialog';
        dialogElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            padding: 30px;
            border-radius: 15px;
            border: 3px solid #fff;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 10000;
            min-width: 300px;
        `;
        
        dialogElement.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">🏠 Housing Required!</h3>
            <p style="margin: 0 0 15px 0; font-size: 16px;">You need more houses to accommodate additional workers and pawns.</p>
            <p style="margin: 0 0 20px 0; font-size: 14px;">Each house can accommodate 8 units (workers + pawns).</p>
            <button id="close-housing-dialog" style="
                background: white;
                color: #e74c3c;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
            ">Build More Houses</button>
        `;
        
        document.body.appendChild(dialogElement);
        
        const closeDialog = () => {
            if (dialogElement.parentNode) {
                dialogElement.parentNode.removeChild(dialogElement);
            }
        };
        
        document.getElementById('close-housing-dialog').addEventListener('click', closeDialog);
        setTimeout(closeDialog, 4000);
    }
    
    // NEW: Show prerequisites dialog
    showPrerequisitesDialog(missingBuildings) {
        const existingDialog = document.getElementById('prerequisites-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const dialogElement = document.createElement('div');
        dialogElement.id = 'prerequisites-dialog';
        dialogElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 30px;
            border-radius: 15px;
            border: 3px solid #fff;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 10000;
            min-width: 300px;
        `;
        
        const buildingNames = missingBuildings.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ');
        
        dialogElement.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">🏗️ Prerequisites Required!</h3>
            <p style="margin: 0 0 15px 0; font-size: 16px;">You need to build: ${buildingNames}</p>
            <p style="margin: 0 0 20px 0; font-size: 14px;">Some units require specific buildings before they can be produced.</p>
            <button id="close-prerequisites-dialog" style="
                background: white;
                color: #f39c12;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
            ">Build Required Structures</button>
        `;
        
        document.body.appendChild(dialogElement);
        
        const closeDialog = () => {
            if (dialogElement.parentNode) {
                dialogElement.parentNode.removeChild(dialogElement);
            }
        };
        
        document.getElementById('close-prerequisites-dialog').addEventListener('click', closeDialog);
        setTimeout(closeDialog, 4000);
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
    this.buildings = []; // NEW: Buildings array
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
    this.gameState = 'playing';
    this.difficulty = 'easy';
    this.musicPlaylist = ['GameMusic2.mp3', 'GameMusic3.mp3', 'GameMusic4.mp3'];
    this.currentTrackIndex = 0;
    this.audioElement = new Audio();
    this.snowflakes = [];
    this.isSnowing = true;
    this.moveLogMessages = [];
    this.zoomLevel = 1.5;
    this.minZoom = 0.5;
    this.maxZoom = 2.5;
    this.baseTileSize = { width: 64, height: 32 };
    this.fogOfWar = new FogOfWar(this.mapWidth, this.mapHeight);
    this.treasureChests = [];
    this.chestSpawnInterval = 20;
}

// Continue with the rest of the game implementation...
// [The rest of the code continues with all the existing functionality plus building system integration]

Game.prototype.init = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const difficultyParam = urlParams.get('difficulty');
    if (['easy', 'hard', 'pro'].includes(difficultyParam)) {
        this.difficulty = difficultyParam;
    }
    console.log(`Game starting with difficulty: ${this.difficulty}`);
    
    this.loadAllImages();
    this.imageManager.onAllLoaded = () => {
        this.imagesLoaded = true; 
        this.generateMap(); 
        this.createUnits();
        this.createInitialBuildings(); // NEW: Create initial buildings
        this.setupEvents(); 
        this.centerOnHometown(); 
        this.initMusicPlayer();
        this.gameLoop(); 
        this.updateUI();
        this.createSnowfall();
        this.showIntroVideo(); // MODIFIED: Show intro video instead of welcome popup
    };
};

// NEW: Show Intro Video
Game.prototype.showIntroVideo = function() {
    const videoOverlay = document.getElementById('intro-video-overlay');
    const video = document.getElementById('intro-video');
    const skipButton = document.getElementById('skip-intro-btn');
    const loadingText = document.getElementById('intro-loading');

    videoOverlay.style.display = 'flex';

    const closeIntro = () => {
        videoOverlay.style.display = 'none';
        video.pause();
    };

    video.onended = () => {
        closeIntro();
    };

    skipButton.onclick = () => {
        closeIntro();
    };

    // Hide loading text when video can play
    video.oncanplay = () => {
        loadingText.style.display = 'none';
    };
};


// NEW: Create initial buildings
Game.prototype.createInitialBuildings = function() {
    // Give human player one house at start
    const humanKing = this.units.find(u => u.owner === 'human' && u.type === 'king');
    if (humanKing) {
        const houseLocation = this.buildingSystem.findBuildingLocation(humanKing.x, humanKing.y, 'human');
        if (houseLocation) {
            const initialHouse = new Building(houseLocation.x, houseLocation.y, 'house', 'human', this);
            initialHouse.isConstructed = true; // Start with completed house
            initialHouse.constructionProgress = initialHouse.constructionTime;
            this.buildings.push(initialHouse);
        }
    }
    
    // Give AI player one house at start
    const aiKing = this.units.find(u => u.owner === 'ai' && u.type === 'king');
    if (aiKing) {
        const houseLocation = this.buildingSystem.findBuildingLocation(aiKing.x, aiKing.y, 'ai');
        if (houseLocation) {
            const initialHouse = new Building(houseLocation.x, houseLocation.y, 'house', 'ai', this);
            initialHouse.isConstructed = true; // Start with completed house
            initialHouse.constructionProgress = initialHouse.constructionTime;
            this.buildings.push(initialHouse);
        }
    }
};

// NEW: Get building at position
Game.prototype.getBuildingAt = function(x, y) {
    return this.buildings.find(building => building.occupiesTile(x, y));
};

Game.prototype.loadAllImages = function() {
    const im = this.imageManager;
    ['grass', 'forest', 'mountain', 'plains', 'swamp'].forEach(t => im.loadImage(t, `tile_${t}.png`));
    
    im.loadWaterFrames();
    im.loadWorkerHumanFrames(); // YENİ
    im.loadWorkerAiFrames();     // YENİ
    
    im.loadImage('castle_human', 'castle_human.png'); 
    im.loadImage('castle_ai', 'castle_ai.png');
    
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
    
    im.loadImage('chest', 'chest.png');
    
    // NEW: Load building images
    im.loadImage('house', 'house.png');
    im.loadImage('blacksmith', 'blacksmith.png');
    im.loadImage('church', 'church.png');
    im.loadImage('palace', 'palace.png');
};

// Continue with all other existing methods...
// [Include all the existing game methods like generateMap, createUnits, render, etc.]
// [The code is getting very long, so I'll include the key new methods and modifications]

// Modified updateUI to include population display
Game.prototype.updateUI = function() {
    document.getElementById('turnDisplay').textContent = `Turn: ${this.turn} (${this.currentPlayer.toLowerCase()})`;
    const res = this.humanResources.resources;
    Object.keys(res).forEach(type => {
        const el = document.getElementById(type);
        if (el) el.textContent = res[type];
    });

    // NEW: Update population display
    const housingInfo = this.buildingSystem.getHousingInfo('human');
    const populationDisplay = document.getElementById('populationDisplay');
    if (populationDisplay) {
        populationDisplay.textContent = `Population: ${housingInfo.currentPopulation}/${housingInfo.housingCapacity}`;
    }

    // Update unit buttons based on housing and prerequisites
    document.querySelectorAll('#unitButtons .unit-btn').forEach(button => {
        const unitType = button.id.replace('produce', '').toLowerCase();
        const cost = this.buildingSystem.unitCosts[unitType];
        
        if (cost) {
            const canProduce = this.buildingSystem.canProduceUnit(unitType, 'human');
            const canAfford = this.humanResources.canAfford(cost);
            
            button.disabled = !canAfford || !canProduce.allowed || this.currentPlayer !== 'human' || this.gameState !== 'playing';
        } else {
            button.disabled = true;
        }
    });
    
    // Update building buttons
    document.querySelectorAll('#buildingButtons .building-btn').forEach(button => {
        const buildingType = button.id.replace('build', '').toLowerCase();
        const cost = this.buildingSystem.buildingCosts[buildingType];
        
        if (cost) {
            button.disabled = !this.humanResources.canAfford(cost) || this.currentPlayer !== 'human' || this.gameState !== 'playing';
        } else {
            button.disabled = true;
        }
    });
    
    document.getElementById('endTurn').disabled = this.currentPlayer !== 'human' || this.gameState !== 'playing';
};

// Modified render method to include buildings
Game.prototype.render = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000000'; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.imagesLoaded) { 
        this.ctx.fillStyle = '#ffffff'; 
        this.ctx.font = '24px Arial'; 
        this.ctx.textAlign = 'center'; 
        this.ctx.fillText('Loading Assets...', this.canvas.width / 2, this.canvas.height / 2); 
        return; 
    }
    
    // Render tiles with fog of war
    for (let y = 0; y < this.mapHeight; y++) { 
        for (let x = 0; x < this.mapWidth; x++) { 
            const tile = this.map[x][y];
            const screenPos = this.tileToScreen(x, y); 
            if (screenPos.x > -this.tileSize.width && screenPos.x < this.canvas.width && 
                screenPos.y > -this.tileSize.height && screenPos.y < this.canvas.height + this.tileSize.height) { 
                
                const fogState = this.fogOfWar.getState(x, y);
                
                if (fogState > 0) {
                    let image;
                    if (tile.terrainType === 'water') {
                        image = this.imageManager.getCurrentWaterFrame();
                    } else {
                        image = this.imageManager.getImage(tile.terrainType);
                    }
                    
                    if (image && image.complete && image.naturalWidth > 0) {
                        this.ctx.drawImage(image, screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height);
                        
                        if (fogState === 1) {
                            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                            this.drawIsometricTile(screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height);
                        }
                    }
                }
            }
        }
    }
    
    // NEW: Render buildings
    this.buildings.forEach(building => {
        if (this.fogOfWar.getState(building.x, building.y) > 0) {
            const screenPos = this.tileToScreen(building.x, building.y);
            const buildingImage = this.imageManager.getImage(building.type);
            
            if (buildingImage && buildingImage.complete && buildingImage.naturalWidth > 0) {
                // Draw building across 2x2 tiles
                const buildingWidth = this.tileSize.width * 2;
                const buildingHeight = this.tileSize.height * 2;
                this.ctx.drawImage(buildingImage, screenPos.x, screenPos.y, buildingWidth, buildingHeight);
                
                // Show construction progress
                if (!building.isConstructed) {
                    const progress = building.constructionProgress / building.constructionTime;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(screenPos.x, screenPos.y, buildingWidth, buildingHeight * (1 - progress));
                    
                    // Render smoke particles
                    building.renderSmokeParticles(this.ctx, this);
                }
            }
        }
    });
    
    // Render treasure chests
    this.treasureChests.forEach(chest => {
        if (!chest.isOpened && this.fogOfWar.getState(chest.x, chest.y) === 2) {
            const screenPos = this.tileToScreen(chest.x, chest.y);
            const chestImage = this.imageManager.getImage('chest');
            if (chestImage && chestImage.complete && chestImage.naturalWidth > 0) {
                this.ctx.drawImage(chestImage, screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height);
            }
        }
    });
    
    // Render possible moves
    this.possibleMoves.forEach(move => { 
        const screenPos = this.tileToScreen(move.x, move.y); 
        this.ctx.fillStyle = move.type === 'attack' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(46, 204, 113, 0.5)'; 
        this.drawIsometricTile(screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
    });
    
        // Render units
    this.units.sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(unit => { 
        if (this.fogOfWar.getState(unit.x, unit.y) === 2 || unit.owner === 'human') {
            const screenPos = this.tileToScreen(unit.x, unit.y); 
            const imageName = unit.type === 'king' ? `castle_${unit.owner}` : `${unit.type}_${unit.owner}`;
            
            let image; // 'image' değişkenini burada tanımlıyoruz

            // YENİ: Birimin tipine göre doğru resmi veya animasyon karesini seç
            if (imageName === 'worker_human') {
                image = this.imageManager.getCurrentWorkerHumanFrame();
            } else if (imageName === 'worker_ai') {
                image = this.imageManager.getCurrentWorkerAiFrame();
            } else {
                // Diğer tüm birimler için eskisi gibi statik resmi al
                image = this.imageManager.getImage(imageName);
            }

            // Resmi çiz
            if (image && image.complete && image.naturalWidth > 0) {
                this.ctx.drawImage(image, screenPos.x, screenPos.y, this.tileSize.width, this.tileSize.height); 
            }
        }
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
    
    this.updateAndDrawSnow();
    this.drawMoveLog();
};

// Modified gameLoop to update buildings
Game.prototype.gameLoop = function() { 
    // Update buildings
    this.buildings.forEach(building => building.update());
    
    this.render(); 
    requestAnimationFrame(() => this.gameLoop()); 
};

// Include all other existing methods...
// [All the other methods from the original game remain the same]
// [This includes: spawnTreasureChest, getChestAt, handleChestInteraction, etc.]
// [Also includes: generateMap, createUnits, setupEvents, etc.]



// =======================================================================
// COMPLETE GAME IMPLEMENTATION - MISSING METHODS
// =======================================================================

Game.prototype.spawnTreasureChest = function() {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        const x = Math.floor(Math.random() * this.mapWidth);
        const y = Math.floor(Math.random() * this.mapHeight);
        
        if (this.isValidTile(x, y) && 
            this.map[x][y].canWalkOn() && 
            !this.getUnitAt(x, y) && 
            !this.getChestAt(x, y) &&
            !this.getBuildingAt(x, y)) {
            
            const chest = new TreasureChest(x, y, this);
            this.treasureChests.push(chest);
            
            this.logSpecialMessage(`A treasure chest has appeared at ${this.getTileName(x, y)}!`, 'rgba(255, 215, 0, 0.9)');
            console.log(`Treasure chest spawned at (${x}, ${y})`);
            return;
        }
        attempts++;
    }
    
    console.log('Failed to spawn treasure chest - no valid location found');
};

Game.prototype.getChestAt = function(x, y) {
    return this.treasureChests.find(chest => chest.x === x && chest.y === y && !chest.isOpened);
};

Game.prototype.handleChestInteraction = function(x, y, unit) {
    const chest = this.getChestAt(x, y);
    if (!chest) return false;
    
    if (!chest.canBeOpenedBy(unit)) {
        this.showChestWorkerOnlyDialog();
        return false;
    }
    
    return chest.open(unit);
};

Game.prototype.showChestWorkerOnlyDialog = function() {
    const existingDialog = document.getElementById('chest-worker-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    const dialogElement = document.createElement('div');
    dialogElement.id = 'chest-worker-dialog';
    dialogElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #8B4513, #A0522D);
        color: #FFD700;
        padding: 30px;
        border-radius: 15px;
        border: 3px solid #FFD700;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        text-align: center;
        font-family: Arial, sans-serif;
        z-index: 10000;
        min-width: 300px;
    `;
    
    dialogElement.innerHTML = `
        <img src="chestImage.png" alt="Treasure Chest" style="width: 64px; height: 64px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 15px 0; color: #FFD700;">Treasure Chest</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px;">Only workers can open treasure chests!</p>
        <button id="close-worker-dialog" style="
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #8B4513;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        ">OK</button>
    `;
    
    document.body.appendChild(dialogElement);
    
    const closeDialog = () => {
        if (dialogElement.parentNode) {
            dialogElement.parentNode.removeChild(dialogElement);
        }
    };
    
    document.getElementById('close-worker-dialog').addEventListener('click', closeDialog);
    setTimeout(closeDialog, 2000);
};

Game.prototype.showWelcomePopup = function() {
    if (document.getElementById('info-popup-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'info-popup-overlay';

    const box = document.createElement('div');
    box.id = 'info-popup-box';

    box.innerHTML = `
        <h2 style="font-family: Arial, sans-serif; font-weight: bold;">Welcome to Enhanced Chessforge!</h2>
        <p style="font-family: Arial, sans-serif; font-weight: bold;">Your goal is to build a city and defeat the enemy <strong>King</strong>!</p>
        
        <h4 style="font-family: Arial, sans-serif; font-weight: bold;">New Building System:</h4>
        <ul>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Houses</strong> provide housing for 8 units (Workers + Pawns)</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Blacksmith</strong> enables Rook and Knight production</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Church</strong> enables Bishop production</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Palace</strong> enables Queen production</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Buildings occupy 4 tiles (2x2) and have construction animations</li>
        </ul>

        <h4 style="font-family: Arial, sans-serif; font-weight: bold;">Population System:</h4>
        <ul>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Workers and Pawns require housing</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Each house accommodates 8 units</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Build more houses to expand your population</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Population display shows current/maximum capacity</li>
        </ul>

        <h4 style="font-family: Arial, sans-serif; font-weight: bold;">Controls & Gameplay:</h4>
        <ul>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Use <strong>Mouse Hold</strong> to move the camera around the map</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Mouse Wheel</strong> to zoom in/out</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Produce <strong>Workers</strong> to gather resources automatically each turn</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Each Worker</strong> provides +10 Wood, +10 Stone, +5 Meat, +10 Grain, +3 Gold, +3 Fish per turn</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Treasure chests</strong> appear every 20 turns and can only be opened by workers!</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- <strong>Fog of war</strong> hides unexplored areas - move your units to reveal the map!</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;">- Build structures and manage your city strategically</li>
        </ul>

        <h4 style="font-family: Arial, sans-serif; font-weight: bold;">Unit Movements:</h4>
        <ul>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>Pawn:</strong> Moves one step forward, attacks diagonally</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>Rook:</strong> Moves in straight lines, horizontally or vertically</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>Bishop:</strong> Moves in diagonal lines</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>Knight:</strong> Moves in an "L" shape (2+1 squares) and can jump over units</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>Queen:</strong> The most powerful piece, combines Rook and Bishop movements</li>
            <li style="font-family: Arial, sans-serif; font-weight: bold;"><strong>King:</strong> Your main base. If it's destroyed, you lose! Can move 1 tile</li>
        </ul>

        <button id="close-popup-btn">Got It, Let's Build!</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('close-popup-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
};

Game.prototype.initMusicPlayer = function() {
    const volumeSlider = document.getElementById('volume-slider');
    
    this.audioElement.volume = volumeSlider.value;
    volumeSlider.addEventListener('input', (e) => {
        this.audioElement.volume = e.target.value;
    });

    this.audioElement.addEventListener('ended', () => {
        this.playNextTrack();
    });

    this.playNextTrack();
};

Game.prototype.playNextTrack = function() {
    if (this.musicPlaylist.length === 0) return;
    
    this.audioElement.src = this.musicPlaylist[this.currentTrackIndex];
    this.audioElement.play().catch(e => console.error("Error playing audio:", e));
    
    document.getElementById('song-info').textContent = `Now Playing: ${this.musicPlaylist[this.currentTrackIndex]}`;
    
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicPlaylist.length;
};

Game.prototype.showUnitDialog = function(unit) {
    this.hideUnitDialog(); 

    const dialogElement = document.createElement('div');
    dialogElement.id = 'unit-dialog';

    const imageSrc = `${unit.type.toLowerCase()}Image.png`;
    const unitName = unit.type.charAt(0).toUpperCase() + unit.type.slice(1);
    
    const responses = [
        "At your command, my lord.", "Your orders, sire?", "I await your command.",
        "What is your will?", "I stand ready, my liege."
    ];
    const randomMessage = responses[Math.floor(Math.random() * responses.length)];

    let additionalContent = '';
    if (unit.type === 'worker') {
        const workerCount = this.units.filter(u => u.owner === 'human' && u.type === 'worker').length;
        const incomePerWorker = { wood: 10, stone: 10, meat: 5, grain: 10, gold: 3, fish: 3 };
        
        let incomeHTML = `<strong>Total Income / Turn (${workerCount} Workers):</strong><div class="income-details">`;
        
        incomeHTML += `<span class="income-item">🪵 Wood: ${workerCount * incomePerWorker.wood}</span>`;
        incomeHTML += `<span class="income-item">🪨 Stone: ${workerCount * incomePerWorker.stone}</span>`;
        incomeHTML += `<span class="income-item">🪙 Gold: ${workerCount * incomePerWorker.gold}</span>`;
        incomeHTML += `<span class="income-item">🥩 Meat: ${workerCount * incomePerWorker.meat}</span>`;
        incomeHTML += `<span class="income-item">🌾 Grain: ${workerCount * incomePerWorker.grain}</span>`;
        incomeHTML += `<span class="income-item">🐟 Fish: ${workerCount * incomePerWorker.fish}</span>`;

        incomeHTML += '</div>';
        additionalContent = `<div class="income-info">${incomeHTML}</div>`;
    }

    dialogElement.innerHTML = `
        <img src="${imageSrc}" alt="${unit.type}" class="portrait">
        <div class="text-area">
            <div class="unit-name">${unitName}:</div>
            <div class="message">"${randomMessage}"</div>
            ${additionalContent} 
        </div>
    `;

    document.body.appendChild(dialogElement);
    
    setTimeout(() => { dialogElement.classList.add('visible'); }, 10);
};

Game.prototype.hideUnitDialog = function() {
    const dialogElement = document.getElementById('unit-dialog');
    if (dialogElement) {
        dialogElement.classList.remove('visible');
        setTimeout(() => {
            if (dialogElement.parentNode) {
                dialogElement.parentNode.removeChild(dialogElement);
            }
        }, 300);
    }
};

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
    
    document.getElementById('restartGame').addEventListener('click', () => {
        document.body.removeChild(overlay);
        this.restartGame();
    });
    
    document.getElementById('closeGame').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
};

Game.prototype.restartGame = function() {
    this.gameState = 'playing';
    this.currentPlayer = 'human';
    this.turn = 1;
    this.selectedUnit = null;
    this.possibleMoves = [];
    
    this.humanResources = new ResourceManager();
    this.aiResources = new ResourceManager();
    
    this.treasureChests = [];
    this.buildings = [];
    
    this.fogOfWar = new FogOfWar(this.mapWidth, this.mapHeight);
    
    this.generateMap();
    this.createUnits();
    this.createInitialBuildings();
    this.centerOnHometown();
    this.updateUI();
    
    console.log('Game restarted!');
};

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
        
        if (this.turn % this.chestSpawnInterval === 0) {
            this.spawnTreasureChest();
        }
        
        this.fogOfWar.update(this.units);

        this.updateUI();
        console.log(`Turn ${this.turn}: Your Turn`);
    }
};

Game.prototype.processAITurn = function() {
    if (this.gameState !== 'playing') return;
    
    console.log("AI is thinking...");
    const aiUnits = this.units.filter(u => u.owner === 'ai');
    const humanUnits = this.units.filter(u => u.owner === 'human');

    // AI unit movement logic
    aiUnits.forEach(unit => {
        if (unit.hasActed) return;

        const moves = unit.getPossibleMoves();
        if (moves.length === 0) return;

        if (unit.type === 'worker') {
            const moveOnly = moves.filter(m => m.type === 'move');
            if (moveOnly.length > 0) {
                const randomMove = moveOnly[Math.floor(Math.random() * moveOnly.length)];
                unit.moveTo(randomMove.x, randomMove.y);
            }
            return;
        }
        
        if (unit.type === 'king') {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            if (randomMove.type === 'move') {
                 unit.moveTo(randomMove.x, randomMove.y);
                 console.log("AI King repositioned itself.");
            }
            return;
        }

        const attackMoves = moves.filter(m => m.type === 'attack');
        
        if (attackMoves.length > 0) {
            const randomAttack = attackMoves[Math.floor(Math.random() * attackMoves.length)];
            const targetUnit = this.getUnitAt(randomAttack.x, randomAttack.y);
            if (targetUnit) {
                this.executeAttack(unit, targetUnit);
            }
            return;
        }
        
        if (humanUnits.length > 0) {
            let closestEnemy = null;
            let minDistance = Infinity;

            humanUnits.forEach(hu => {
                const dist = Math.abs(hu.x - unit.x) + Math.abs(hu.y - unit.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = hu;
                }
            });

            if (!closestEnemy) return;

            let bestMove = null;
            let bestMoveDist = Infinity;

            moves.forEach(move => {
                const distToEnemy = Math.abs(move.x - closestEnemy.x) + Math.abs(move.y - closestEnemy.y);
                if (distToEnemy < bestMoveDist) {
                    bestMoveDist = distToEnemy;
                    bestMove = move;
                }
            });

            if (bestMove && bestMoveDist >= minDistance) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                unit.moveTo(randomMove.x, randomMove.y);
                console.log(`AI ${unit.type} at (${unit.x},${unit.y}) was stuck, moving randomly.`);
            } else if (bestMove) {
                unit.moveTo(bestMove.x, bestMove.y);
            }
        }
    });

 // =================== BU BLOKLA DEĞİŞTİRİN ===================

    // AI building and production logic
    const workerCount = aiUnits.filter(u => u.type === 'worker').length;
    const housingInfo = this.buildingSystem.getHousingInfo('ai');
    const aiKing = this.units.find(u => u.owner === 'ai' && u.type === 'king');

    if (!aiKing) {
        console.log("AI turn skipped: King not found.");
        this.endTurn();
        return;
    }

    // Bina varlıklarını her turda kontrol et
    const hasBlacksmith = this.buildings.some(b => b.owner === 'ai' && b.type === 'blacksmith' && b.isConstructed);
    const hasChurch = this.buildings.some(b => b.owner === 'ai' && b.type === 'church' && b.isConstructed);
    const hasPalace = this.buildings.some(b => b.owner === 'ai' && b.type === 'palace' && b.isConstructed);

    // --- AŞAMALI BİNA İNŞAATI ---
    // AI her koşul bloğunu ayrı ayrı değerlendirecek ve kaynakları yettiğince inşa edecek.

    // 1. Blacksmith yoksa, inşa etmeye çalış.
    if (!hasBlacksmith && this.aiResources.canAfford(this.buildingSystem.buildingCosts.blacksmith)) {
        const buildLocation = this.buildingSystem.findBuildingLocation(aiKing.x, aiKing.y, 'ai');
        if (buildLocation) {
            this.buildingSystem.buildBuilding('blacksmith', 'ai', buildLocation.x, buildLocation.y);
        }
    }

    // 2. Blacksmith VARSA ve Church yoksa, Church inşa etmeye çalış.
    if (hasBlacksmith && !hasChurch && this.aiResources.canAfford(this.buildingSystem.buildingCosts.church)) {
        const buildLocation = this.buildingSystem.findBuildingLocation(aiKing.x, aiKing.y, 'ai');
        if (buildLocation) {
            this.buildingSystem.buildBuilding('church', 'ai', buildLocation.x, buildLocation.y);
        }
    }

    // 3. Church ve Blacksmith VARSA ve Palace yoksa, Palace inşa etmeye çalış.
    if (hasChurch && hasBlacksmith && !hasPalace && this.aiResources.canAfford(this.buildingSystem.buildingCosts.palace)) {
        const buildLocation = this.buildingSystem.findBuildingLocation(aiKing.x, aiKing.y, 'ai');
        if (buildLocation) {
            this.buildingSystem.buildBuilding('palace', 'ai', buildLocation.x, buildLocation.y);
        }
    }

    // 4. Nüfus sorunu varsa, her zaman ev inşa etmeye çalışsın.
    if (housingInfo.availableHousing <= 2 && workerCount < 10 && this.aiResources.canAfford(this.buildingSystem.buildingCosts.house)) {
        const buildLocation = this.buildingSystem.findBuildingLocation(aiKing.x, aiKing.y, 'ai');
        if (buildLocation) {
            this.buildingSystem.buildBuilding('house', 'ai', buildLocation.x, buildLocation.y);
        }
    }


    // --- AŞAMALI BİRİM ÜRETİMİ ---
    // AI, mevcut binalarına göre hangi birimleri üretebileceğine karar verecek.
    
    // Temel ekonomi: Yeterli işçi yoksa her zaman üretmeye çalış.
    if (workerCount < 5) {
        this.buildingSystem.produceUnit('worker', 'ai');
    }

    // Gelişmiş birimler: İlgili binalar varsa üret.
    if (hasPalace) {
        this.buildingSystem.produceUnit('queen', 'ai'); // Kaynak varsa Queen üretmeyi dene
    }
    if (hasChurch) {
        this.buildingSystem.produceUnit('bishop', 'ai'); // Kaynak varsa Bishop üretmeyi dene
    }
    if (hasBlacksmith) {
    const unitToProduce = Math.random() < 0.5 ? 'knight' : 'rook';
    this.buildingSystem.produceUnit(unitToProduce, 'ai');
}

    // Her zaman üretilebilecek temel askeri birim.
    // Kaynakları yettiği sürece birden fazla üretmeyi deneyebilir.
    // Bunu bir döngü ile yapabiliriz ki daha agresif olsun.
    for (let i = 0; i < 2; i++) { // Örnek: Her tur en fazla 2 pawn üretmeyi denesin
        this.buildingSystem.produceUnit('pawn', 'ai');
    }
    
    // Ekonomi takviyesi: Askeri birimlerden sonra hala kaynak varsa ve işçi limiti dolmadıysa, işçi üret.
    if (workerCount < 10) {
        this.buildingSystem.produceUnit('worker', 'ai');
    }

    // 100. Turda "gizli" kaynak patlaması
    if (this.turn === 100) {
        console.log("AI HAS UNLEASHED ITS SECRET POWER! (Turn 100 Bonus)");
        const allResources = Object.keys(this.aiResources.resources);
        allResources.forEach(res => this.aiResources.addResource(res, 20000));
        this.logSpecialMessage("You feel a dark presence growing in the north...", 'rgba(142, 68, 173, 0.9)');
    }

    console.log("AI finished its multi-action turn.");
    this.endTurn();

// =================== DEĞİŞİMİN SONU ===================
};

Game.prototype.executeAttack = function(attacker, defender) {
    const attackerName = `${attacker.owner === 'human' ? 'Your' : 'Enemy'} ${attacker.type}`;
    const defenderName = `${defender.owner === 'human' ? 'your' : "enemy's"} ${defender.type}`;
    const message = `${attackerName} captures ${defenderName}!`;

    this.playSoundEffect('effect1.mp3');
    
    const color = attacker.owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
    
    this.logSpecialMessage(message, color);

    this.units = this.units.filter(u => u !== defender);
    
    attacker.moveTo(defender.x, defender.y);

    if (defender.type === 'king') {
        setTimeout(() => this.checkWinCondition(), 100);
    }
};

Game.prototype.generateMap = function() {
    console.log(`Generating map with a variable-sized gulf...`);

    this.gulfSettings = {
        size: Math.random() < 0.5 ? 0.75 : 0.50,
        verticalPosition: ['top', 'middle', 'bottom'][Math.floor(Math.random() * 3)],
        horizontalPosition: Math.random() < 0.5 ? 'left' : 'right'
    };
    
    console.log('This game\'s gulf settings:', this.gulfSettings);

    this.map = Array.from({ length: this.mapWidth }, (_, x) =>
        Array.from({ length: this.mapHeight }, (_, y) => this.generateTile(x, y))
    );
};

Game.prototype.generateTile = function(x, y) {
    const name = this.getTileName(x, y);
    
    const humanStartY = this.mapHeight - 5;
    const aiStartY = 4;
    const startZoneRadius = 5;

    const distToHumanStart = Math.sqrt(Math.pow(x - Math.floor(this.mapWidth / 2), 2) + Math.pow(y - humanStartY, 2));
    const distToAiStart = Math.sqrt(Math.pow(x - Math.floor(this.mapWidth / 2), 2) + Math.pow(y - aiStartY, 2));

    if (distToHumanStart < startZoneRadius || distToAiStart < startZoneRadius) {
        return new Tile(x, y, name, 'plains', null, 0);
    }

    const gs = this.gulfSettings;
    let seaCenterY;
    if (gs.verticalPosition === 'top') seaCenterY = this.mapHeight * 0.25;
    else if (gs.verticalPosition === 'bottom') seaCenterY = this.mapHeight * 0.75;
    else seaCenterY = this.mapHeight * 0.5;

    const seaWidth = 6;
    const seaWobble = this.simpleNoise(x * 0.1, y * 0.1) * 3;
    const inVerticalZone = y > seaCenterY - seaWidth + seaWobble && y < seaCenterY + seaWidth + seaWobble;

    if (inVerticalZone) {
        if ((gs.horizontalPosition === 'left' && x < this.mapWidth * gs.size) ||
            (gs.horizontalPosition === 'right' && x > this.mapWidth * (1 - gs.size))) {
            return new Tile(x, y, name, 'water', 'fish', 1500);
        }
    }

    const noise = this.simpleNoise(x * 0.08, y * 0.08);

    if (noise > 0.9) {
        return new Tile(x, y, name, 'mountain', 'stone', 2500);
    }
    if (noise > 0.4) {
        return new Tile(x, y, name, 'forest', 'wood', 1000);
    }
    if (noise < -0.2) {
        return new Tile(x, y, name, 'swamp', 'meat', 600);
    }
    const puddleNoise = this.simpleNoise(x * 0.35, y * 0.35);
    if (puddleNoise > 0.9) {
        return new Tile(x, y, name, 'water', 'fish', 300);
    }

    return new Tile(x, y, name, 'grass');
};

Game.prototype.simpleNoise = function(x, y) { 
    const s = Math.sin(x*12.9898+y*78.233)*43758.5453; 
    return (s-Math.floor(s))*2-1; 
};

Game.prototype.createUnits = function() {
    this.units = [];
    const hx = Math.floor(this.mapWidth / 2), hy = this.mapHeight - 5;
    const ax = Math.floor(this.mapWidth / 2), ay = 4;
    
    this.units.push(new King(hx, hy, 'human', this));
    this.units.push(new King(ax, ay, 'ai', this));

    this.fogOfWar.exploreArea(ax, ay, 4);
    this.fogOfWar.exploreArea(hx, hy, 6);
    
    this.units.push(new Worker(hx - 1, hy - 1, 'human', this));
    this.units.push(new Worker(hx + 1, hy - 1, 'human', this));
    this.units.push(new Worker(ax - 1, ay + 1, 'ai', this));
    this.units.push(new Worker(ax + 1, ay + 1, 'ai', this));
    
    this.fogOfWar.update(this.units);
    
    let bonusUnits = {};
    if (this.difficulty === 'hard') {
        bonusUnits = { bishop: 2, rook: 2, knight: 2, queen: 1 };
    } else if (this.difficulty === 'pro') {
        bonusUnits = { bishop: 6, rook: 6, knight: 6, queen: 4 };
    }
    
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

Game.prototype.createSnowfall = function(count = 150) {
    if (!this.isSnowing) return;
    this.snowflakes = [];
    for (let i = 0; i < count; i++) {
        this.snowflakes.push(new Snowflake(this.canvas.width, this.canvas.height));
    }
};

Game.prototype.updateAndDrawSnow = function() {
    if (!this.isSnowing) return;
    
    this.snowflakes.forEach(snowflake => {
        snowflake.update();
        snowflake.draw(this.ctx);
    });
};

Game.prototype.drawMoveLog = function() {
    const currentTime = Date.now();
    const messageLifetime = 3000;
    const fadeDuration = 500;
    
    this.moveLogMessages = this.moveLogMessages.filter(msg => 
        currentTime - msg.creationTime < messageLifetime
    );

    const startX = 20;
    const startY = 30;
    const lineHeight = 20;

    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'left';

    this.moveLogMessages.forEach((msg, index) => {
        const age = currentTime - msg.creationTime;
        let opacity = 1.0;

        if (age > messageLifetime - fadeDuration) {
            opacity = 1.0 - (age - (messageLifetime - fadeDuration)) / fadeDuration;
        }

        const [r, g, b] = msg.color.match(/\d+/g);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        
        this.ctx.fillText(msg.text, startX, startY + (index * lineHeight));
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

Game.prototype.logMove = function(unit, from, to) {
    const fromName = this.getTileName(from.x, from.y);
    const toName = this.getTileName(to.x, to.y);
    const text = `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} ${fromName} -> ${toName}`;
    const color = unit.owner === 'human' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
    this.logSpecialMessage(text, color);
};

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

Game.prototype.playSoundEffect = function(soundFile) {
    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Sound effect failed to play:", e));
};

Game.prototype.setupEvents = function() {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragThreshold = 5; 
    let dragDistance = 0;

    document.addEventListener('keydown', (e) => { 
        if (e.key.toLowerCase() === 'escape') {
            this.deselectUnit(); 
        }
    });

    this.canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragDistance = 0;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('mouseup', (e) => {
        isDragging = false;
    });

    this.canvas.addEventListener('mouseleave', (e) => {
        isDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            
            dragDistance += Math.abs(dx) + Math.abs(dy);
            
            this.camera.x -= dx;
            this.camera.y -= dy;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            this.hoveredTile = null;
        } else {
            const rect = this.canvas.getBoundingClientRect(); 
            const scaleX = this.canvas.width / rect.width; 
            const scaleY = this.canvas.height / rect.height; 
            const screenX = (e.clientX - rect.left) * scaleX; 
            const screenY = (e.clientY - rect.top) * scaleY; 
            const worldCoords = this.screenToWorld(screenX, screenY); 
            this.hoveredTile = this.worldToTile(worldCoords.x, worldCoords.y);
        }
    });
    
    this.canvas.addEventListener('click', (e) => {
        if (dragDistance < dragThreshold) {
            if (this.hoveredTile) this.handleTileClick(this.hoveredTile.x, this.hoveredTile.y);
        }
    });

    this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseScreenX = (e.clientX - rect.left) * scaleX;
        const mouseScreenY = (e.clientY - rect.top) * scaleY;
        const worldPosBeforeZoom = this.screenToWorld(mouseScreenX, mouseScreenY);

        const zoomAmount = 0.1;
        if (e.deltaY > 0) {
            this.zoomLevel -= zoomAmount;
        } else {
            this.zoomLevel += zoomAmount;
        }
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel));

        this.tileSize.width = this.baseTileSize.width * this.zoomLevel;
        this.tileSize.height = this.baseTileSize.height * this.zoomLevel;

        const worldPosAfterZoom = this.screenToWorld(mouseScreenX, mouseScreenY);

        this.camera.x += worldPosBeforeZoom.x - worldPosAfterZoom.x;
        this.camera.y += worldPosBeforeZoom.y - worldPosAfterZoom.y;

    }, { passive: false });
    
    document.getElementById('showTutorial').addEventListener('click', () => this.showWelcomePopup());
    document.getElementById('endTurn').addEventListener('click', () => this.endTurn());
    document.getElementById('produceWorker').addEventListener('click', () => this.buildingSystem.produceUnit('worker', 'human'));
    document.getElementById('producePawn').addEventListener('click', () => this.buildingSystem.produceUnit('pawn', 'human'));
    document.getElementById('produceRook').addEventListener('click', () => this.buildingSystem.produceUnit('rook', 'human'));
    document.getElementById('produceBishop').addEventListener('click', () => this.buildingSystem.produceUnit('bishop', 'human'));
    document.getElementById('produceKnight').addEventListener('click', () => this.buildingSystem.produceUnit('knight', 'human'));
    document.getElementById('produceQueen').addEventListener('click', () => this.buildingSystem.produceUnit('queen', 'human'));
    
    // NEW: Building buttons
    document.getElementById('buildHouse').addEventListener('click', () => this.handleBuildingPlacement('house'));
    document.getElementById('buildBlacksmith').addEventListener('click', () => this.handleBuildingPlacement('blacksmith'));
    document.getElementById('buildChurch').addEventListener('click', () => this.handleBuildingPlacement('church'));
    document.getElementById('buildPalace').addEventListener('click', () => this.handleBuildingPlacement('palace'));
};

// NEW: Handle building placement
Game.prototype.handleBuildingPlacement = function(buildingType) {
    if (this.currentPlayer !== 'human' || this.gameState !== 'playing') return;
    
    const cost = this.buildingSystem.buildingCosts[buildingType];
    if (!this.humanResources.canAfford(cost)) {
        console.log(`Not enough resources to build ${buildingType}`);
        return;
    }
    
    // Find suitable location near king
    const humanKing = this.units.find(u => u.owner === 'human' && u.type === 'king');
    if (!humanKing) return;
    
    const buildLocation = this.buildingSystem.findBuildingLocation(humanKing.x, humanKing.y, 'human');
    if (!buildLocation) {
        console.log(`No suitable location found for ${buildingType}`);
        this.game.logSpecialMessage(
        `No valid spawn location found for ${unitType}`,
        'rgba(231, 76, 60, 0.9)' // kırmızımsı hata rengi
    );
        return;
    }
    
    this.buildingSystem.buildBuilding(buildingType, 'human', buildLocation.x, buildLocation.y);
};

Game.prototype.handleTileClick = function(x, y) {
    if (this.currentPlayer !== 'human' || this.gameState !== 'playing') return;
    
    const unitOnTile = this.getUnitAt(x, y);
    const chestOnTile = this.getChestAt(x, y);

    if (chestOnTile && this.selectedUnit && this.selectedUnit.type === 'worker') {
        const move = this.possibleMoves.find(m => m.x === x && m.y === y);
        if (move && move.type === 'move') {
            this.selectedUnit.moveTo(x, y);
            this.handleChestInteraction(x, y, this.selectedUnit);
            this.deselectUnit();
            this.hideUnitDialog();
            return;
        }
    }
    
    if (chestOnTile && this.selectedUnit && this.selectedUnit.type !== 'worker') {
        this.showChestWorkerOnlyDialog();
        return;
    }

    if (this.selectedUnit) {
        const move = this.possibleMoves.find(m => m.x === x && m.y === y);
        if (move) { 
            if (move.type === 'attack') {
                this.executeAttack(this.selectedUnit, unitOnTile); 
            } else {
                this.selectedUnit.moveTo(x, y); 
            }
            this.deselectUnit();
            this.hideUnitDialog();
        } else { 
            this.deselectUnit();
            this.hideUnitDialog();
            
            if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed) {
                this.selectUnit(unitOnTile); 
                this.showUnitDialog(unitOnTile);
            }
        }
    } 
    else if (unitOnTile && unitOnTile.owner === 'human' && !unitOnTile.hasActed) {
        this.selectUnit(unitOnTile); 
        this.showUnitDialog(unitOnTile);
    } 
    else {
        this.deselectUnit();
        this.hideUnitDialog();
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
    const chestOnTile = this.getChestAt(x, y);
    const buildingOnTile = this.getBuildingAt(x, y);
    
    // Can't move to tiles with buildings
    if (buildingOnTile) return {isValid: false};
    
    if (chestOnTile && !unitOnTile) {
        return { isValid: true, type: 'move' };
    }
    
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

Game.prototype.worldToTile = function(worldX, worldY) {
    const halfTileWidth = this.tileSize.width / 2;
    const halfTileHeight = this.tileSize.height / 2;

    const term1 = worldX / halfTileWidth;
    const term2 = worldY / halfTileHeight;

    const tileX = Math.round((term1 + term2) / 2 - 0.5);
    const tileY = Math.round((term2 - term1) / 2);

    if (this.isValidTile(tileX, tileY)) {
        return { x: tileX, y: tileY };
    }
    return null;
};



