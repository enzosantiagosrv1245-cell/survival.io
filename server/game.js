const Player = require('./player');
const Entity = require('./entity');
const CraftingSystem = require('./crafting');
const config = require('./config');

class Game {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.players = new Map();
    this.entities = new Map();
    this.buildings = new Map();
    this.nextEntityId = 0;
    this.nextBuildingId = 0;
    this.tickRate = 1000 / 60;
    this.lastUpdate = Date.now();
    
    this.initWorld();
  }

  initWorld() {
    for (let i = 0; i < config.TREE_COUNT; i++) {
      this.spawnEntity('tree');
    }
    for (let i = 0; i < config.ROCK_COUNT; i++) {
      this.spawnEntity('rock');
    }
    for (let i = 0; i < config.BUSH_COUNT; i++) {
      this.spawnEntity('bush');
    }
    for (let i = 0; i < 50; i++) {
      this.spawnEntity('iron_node');
    }
  }

  spawnEntity(type) {
    const x = Math.random() * (config.WORLD_WIDTH - 100) + 50;
    const y = Math.random() * (config.WORLD_HEIGHT - 100) + 50;
    const entity = new Entity(this.nextEntityId++, type, x, y);
    this.entities.set(entity.id, entity);
  }

  start() {
    setInterval(() => this.update(), this.tickRate);
  }

  update() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    for (const player of this.players.values()) {
      player.update(dt);
      
      if (player.isDead()) {
        this.handlePlayerDeath(player);
      }
    }

    this.broadcastGameState();
  }

  addPlayer(socket, data) {
    const x = Math.random() * config.WORLD_WIDTH;
    const y = Math.random() * config.WORLD_HEIGHT;
    const player = new Player(socket.id, data.username, data.userId, x, y);
    
    this.players.set(socket.id, player);
    socket.emit('init', {
      playerId: socket.id,
      worldSize: { width: config.WORLD_WIDTH, height: config.WORLD_HEIGHT },
      recipes: CraftingSystem.getRecipes()
    });
    
    console.log(`Player ${data.username} joined at (${x}, ${y})`);
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player && player.userId) {
      this.db.updateStats(player.userId, {
        kills: player.kills,
        deaths: player.deaths,
        resources_collected: player.resourcesCollected,
        games_played: 1,
        total_score: player.score
      });
    }
    this.players.delete(socketId);
  }

  handleInput(socketId, input) {
    const player = this.players.get(socketId);
    if (!player) return;

    if (input.movement) {
      player.setVelocity(input.movement.x, input.movement.y);
    }

    if (input.action === 'harvest' && input.targetId !== undefined) {
      this.handleHarvest(player, input.targetId);
    }

    if (input.action === 'attack' && input.targetId !== undefined) {
      this.handleAttack(player, input.targetId);
    }

    if (input.action === 'eat') {
      player.consumeFood(1);
    }

    if (input.action === 'build' && input.buildType) {
      this.handleBuild(player, input.buildType, input.x, input.y);
    }
  }

  handleHarvest(player, entityId) {
    const entity = this.entities.get(entityId);
    if (!entity || entity.harvested) return;

    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    if (distance > 80) return;

    const destroyed = entity.damage(player.toolPower);
    
    if (destroyed) {
      player.addResource(entity.resource, entity.yield);
      setTimeout(() => {
        this.entities.delete(entityId);
        this.spawnEntity(entity.type);
      }, 10000);
    }
  }

  handleAttack(player, targetId) {
    const target = this.players.get(targetId);
    if (!target || target.id === player.id) return;

    const distance = Math.hypot(player.x - target.x, player.y - target.y);
    if (distance > 100) return;

    const killed = target.takeDamage(player.attackPower);
    
    if (killed) {
      player.kills++;
      player.score += 100;
      this.handlePlayerDeath(target);
    }
  }

  handlePlayerDeath(player) {
    const x = Math.random() * config.WORLD_WIDTH;
    const y = Math.random() * config.WORLD_HEIGHT;
    player.respawn(x, y);
    
    this.io.to(player.id).emit('respawn', { x, y });
  }

  handleBuild(player, buildType, x, y) {
    if (buildType === 'wall') {
      if (player.inventory.wood >= 20 && player.inventory.stone >= 10) {
        player.inventory.wood -= 20;
        player.inventory.stone -= 10;
        
        const building = {
          id: this.nextBuildingId++,
          type: 'wall',
          x: x,
          y: y,
          width: 100,
          height: 20,
          ownerId: player.id
        };
        this.buildings.set(building.id, building);
      }
    }
  }

  handleCraft(socketId, recipeId) {
    const player = this.players.get(socketId);
    if (!player) return;

    const result = CraftingSystem.craft(player, recipeId);
    this.io.to(socketId).emit('craftResult', result);
  }

  handleChat(socketId, message) {
    const player = this.players.get(socketId);
    if (!player) return;

    if (message.startsWith('/')) {
      this.handleCommand(player, message);
      return;
    }

    this.io.emit('chat', {
      username: player.username,
      message: message,
      timestamp: Date.now()
    });
  }

  handleCommand(player, command) {
    const args = command.slice(1).split(' ');
    const cmd = args[0].toLowerCase();

    switch(cmd) {
      case 'god':
        player.isGodMode = !player.isGodMode;
        this.io.to(player.id).emit('message', `God mode: ${player.isGodMode ? 'ON' : 'OFF'}`);
        break;
      
      case 'speed':
        if (args[1]) {
          player.speed = parseFloat(args[1]);
          this.io.to(player.id).emit('message', `Speed set to ${player.speed}`);
        }
        break;
      
      case 'resources':
        if (args[1] && args[2]) {
          const resource = args[1];
          const amount = parseInt(args[2]);
          if (player.inventory.hasOwnProperty(resource)) {
            player.inventory[resource] += amount;
            this.io.to(player.id).emit('message', `Added ${amount} ${resource}`);
          }
        }
        break;
      
      case 'tp':
        if (args[1] && args[2]) {
          player.x = parseFloat(args[1]);
          player.y = parseFloat(args[2]);
          this.io.to(player.id).emit('message', `Teleported to (${player.x}, ${player.y})`);
        }
        break;
      
      case 'cleardata':
        if (player.userId) {
          this.db.updateStats(player.userId, { kills: -player.kills, deaths: -player.deaths });
          this.io.to(player.id).emit('message', 'Data cleared');
        }
        break;
    }
  }

  broadcastGameState() {
    for (const [socketId, player] of this.players) {
      const visiblePlayers = [];
      const visibleEntities = [];
      const visibleBuildings = [];

      for (const otherPlayer of this.players.values()) {
        const distance = Math.hypot(player.x - otherPlayer.x, player.y - otherPlayer.y);
        if (distance < config.PLAYER_VIEW_DISTANCE) {
          visiblePlayers.push(otherPlayer.getState());
        }
      }

      for (const entity of this.entities.values()) {
        if (entity.harvested) continue;
        const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
        if (distance < config.PLAYER_VIEW_DISTANCE) {
          visibleEntities.push(entity.getState());
        }
      }

      for (const building of this.buildings.values()) {
        const distance = Math.hypot(player.x - building.x, player.y - building.y);
        if (distance < config.PLAYER_VIEW_DISTANCE) {
          visibleBuildings.push(building);
        }
      }

      this.io.to(socketId).emit('gameState', {
        players: visiblePlayers,
        entities: visibleEntities,
        buildings: visibleBuildings,
        timestamp: Date.now()
      });
    }
  }
}

module.exports = Game;