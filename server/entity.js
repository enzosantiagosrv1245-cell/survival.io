class Entity {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.harvested = false;
    
    switch(type) {
      case 'tree':
        this.size = 40;
        this.health = 30;
        this.maxHealth = 30;
        this.resource = 'wood';
        this.yield = 5;
        this.color = '#228B22';
        break;
      case 'rock':
        this.size = 35;
        this.health = 40;
        this.maxHealth = 40;
        this.resource = 'stone';
        this.yield = 4;
        this.color = '#808080';
        break;
      case 'bush':
        this.size = 25;
        this.health = 10;
        this.maxHealth = 10;
        this.resource = 'food';
        this.yield = 3;
        this.color = '#90EE90';
        break;
      case 'iron_node':
        this.size = 30;
        this.health = 60;
        this.maxHealth = 60;
        this.resource = 'iron';
        this.yield = 2;
        this.color = '#A9A9A9';
        break;
    }
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.harvested = true;
      return true;
    }
    return false;
  }

  getState() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      size: this.size,
      health: this.health,
      maxHealth: this.maxHealth,
      harvested: this.harvested,
      color: this.color
    };
  }
}

module.exports = Entity;