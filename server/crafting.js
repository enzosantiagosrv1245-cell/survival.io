const RECIPES = {
  wooden_axe: {
    name: 'Wooden Axe',
    cost: { wood: 10 },
    type: 'tool'
  },
  stone_axe: {
    name: 'Stone Axe',
    cost: { wood: 10, stone: 15 },
    type: 'tool'
  },
  iron_axe: {
    name: 'Iron Axe',
    cost: { wood: 15, stone: 10, iron: 10 },
    type: 'tool'
  },
  wooden_spear: {
    name: 'Wooden Spear',
    cost: { wood: 15 },
    type: 'weapon'
  },
  stone_sword: {
    name: 'Stone Sword',
    cost: { wood: 10, stone: 20 },
    type: 'weapon'
  },
  iron_sword: {
    name: 'Iron Sword',
    cost: { wood: 10, stone: 15, iron: 15 },
    type: 'weapon'
  },
  wooden_armor: {
    name: 'Wooden Armor',
    cost: { wood: 25 },
    type: 'armor'
  },
  stone_armor: {
    name: 'Stone Armor',
    cost: { wood: 15, stone: 30 },
    type: 'armor'
  },
  iron_armor: {
    name: 'Iron Armor',
    cost: { wood: 10, stone: 20, iron: 25 },
    type: 'armor'
  },
  wall: {
    name: 'Wall',
    cost: { wood: 20, stone: 10 },
    type: 'building'
  },
  campfire: {
    name: 'Campfire',
    cost: { wood: 15, stone: 5 },
    type: 'building'
  }
};

class CraftingSystem {
  static canCraft(player, recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) return false;
    
    for (const [resource, amount] of Object.entries(recipe.cost)) {
      if (!player.inventory[resource] || player.inventory[resource] < amount) {
        return false;
      }
    }
    return true;
  }

  static craft(player, recipeId) {
    if (!this.canCraft(player, recipeId)) {
      return { success: false, message: 'Not enough resources' };
    }

    const recipe = RECIPES[recipeId];
    
    for (const [resource, amount] of Object.entries(recipe.cost)) {
      player.inventory[resource] -= amount;
    }

    switch(recipe.type) {
      case 'tool':
        player.equipTool(recipeId);
        break;
      case 'weapon':
        player.equipWeapon(recipeId);
        break;
      case 'armor':
        player.equipArmor(recipeId);
        break;
      case 'building':
        return { success: true, message: `Crafted ${recipe.name}`, item: recipeId };
    }

    return { success: true, message: `Crafted and equipped ${recipe.name}` };
  }

  static getRecipes() {
    return RECIPES;
  }
}

module.exports = CraftingSystem;