module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  
  // Game World
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 4000,
  TILE_SIZE: 50,
  
  // Player
  PLAYER_SIZE: 30,
  PLAYER_SPEED: 4,
  PLAYER_MAX_HEALTH: 100,
  PLAYER_MAX_HUNGER: 100,
  HUNGER_DECAY_RATE: 0.05,
  HEALTH_REGEN_RATE: 0.1,
  PLAYER_VIEW_DISTANCE: 800,
  
  // Resources
  TREE_COUNT: 200,
  ROCK_COUNT: 150,
  BUSH_COUNT: 180,
  
  // Combat
  ATTACK_RANGE: 100,
  HARVEST_RANGE: 80,
  
  // Respawn
  RESPAWN_DELAY: 3000,
  
  // Update rate
  TICK_RATE: 60
};