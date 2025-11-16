const config = require('./config');

class Player {
  constructor(id, username, userId, x, y) {
    this.id = id;
    this.username = username;
    this.userId = userId;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = config.PLAYER_SIZE;
    this.speed = config.PLAYER_SPEED;
    this.health = config.PLAYER_MAX_HEALTH;
    this.maxHealth = config.PLAYER_MAX_HEALTH;
    this.hunger = config.PLAYER_MAX_HUNGER;
    this.maxHunger = config.PLAYER_MAX_HUNGER;
    
    this.inventory = {
      wood: 0,
      stone: 0,
      food: 0,
      iron: 0
    };
    
    this.equipment = {
      tool: 'hand',
      weapon: 'fist',
      armor: 'none'
    };
    
    this.toolPower = 1;
    this.attackPower = 5;
    this.defense = 0;
    
    this.kills = 0;
    this.deaths = 0;
    this.resourcesCollected = 0;
    this.score = 0;
    this.isGodMode = false;
  }

  update(dt) {
    this.x += this.vx * this.speed;
    this.y += this.vy * this.speed;
    
    this.x = Math.max(this.size, Math.min(config.WORLD_WIDTH - this.size, this.x));
    this.y = Math.max(this.size, Math.min(config.WORLD_HEIGHT - this.size, this.y));
    
    if (!this.isGodMode) {
      this.hunger -= config.HUNGER_DECAY_RATE * dt;
      this.hunger = Math.max(0, this.hunger);
      
      if (this.hunger <= 0) {
        this.health -= 0.1 * dt;
      } else if (this.hunger > 50 && this.health < this.maxHealth) {
        this.health += config.HEALTH_REGEN_RATE * dt;
      }
      
      this.health = Math.max(0, Math.min(this.maxHealth, this.health));
    }
  }

  setVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  addResource(type, amount) {
    if (this.inventory.hasOwnProperty(type)) {
      this.inventory[type] += amount;
      this.resourcesCollected += amount;
      this.score += amount * 10;
    }
  }

  consumeFood(amount) {
    if (this.inventory.food >= amount) {
      this.inventory.food -= amount;
      this.hunger = Math.min(this.maxHunger, this.hunger + 30);
      return true;
    }
    return false;
  }

  equipTool(tool) {
    this.equipment.tool = tool;
    switch(tool) {
      case 'wooden_axe': this.toolPower = 2; break;
      case 'stone_axe': this.toolPower = 3; break;
      case 'iron_axe': this.toolPower = 5; break;
      default: this.toolPower = 1;
    }
  }

  equipWeapon(weapon) {
    this.equipment.weapon = weapon;
    switch(weapon) {
      case 'wooden_spear': this.attackPower = 15; break;
      case 'stone_sword': this.attackPower = 25; break;
      case 'iron_sword': this.attackPower = 40; break;
      default: this.attackPower = 5;
    }
  }

  equipArmor(armor) {
    this.equipment.armor = armor;
    switch(armor) {
      case 'wooden_armor': this.defense = 5; break;
      case 'stone_armor': this.defense = 10; break;
      case 'iron_armor': this.defense = 20; break;
      default: this.defense = 0;
    }
  }

  takeDamage(damage) {
    if (this.isGodMode) return false;
    
    const actualDamage = Math.max(1, damage - this.defense);
    this.health -= actualDamage;
    return this.health <= 0;
  }

  isDead() {
    return this.health <= 0;
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.inventory = { wood: 0, stone: 0, food: 0, iron: 0 };
    this.equipment = { tool: 'hand', weapon: 'fist', armor: 'none' };
    this.toolPower = 1;
    this.attackPower = 5;
    this.defense = 0;
    this.deaths++;
  }

  getState() {
    return {
      id: this.id,
      username: this.username,
      x: this.x,
      y: this.y,
      size: this.size,
      health: this.health,
      maxHealth: this.maxHealth,
      hunger: this.hunger,
      maxHunger: this.maxHunger,
      inventory: this.inventory,
      equipment: this.equipment,
      kills: this.kills,
      score: this.score
    };
  }
}

module.exports = Player;