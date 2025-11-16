let socket;
let canvas, ctx;
let camera = { x: 0, y: 0 };
let worldSize = { width: 4000, height: 4000 };
let playerId = null;
let localPlayer = null;
let gameState = { players: [], entities: [], buildings: [] };
let recipes = {};
let keys = {};
let mousePos = { x: 0, y: 0 };
let currentUser = null;

function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }
}

async function register() {
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  const errorEl = document.getElementById('errorMessage');
  
  if (!username || !password) {
    errorEl.textContent = 'Please fill all fields';
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    return;
  }
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      errorEl.textContent = '';
      showTab('login');
      document.getElementById('loginUsername').value = username;
    } else {
      errorEl.textContent = data.error;
    }
  } catch (error) {
    errorEl.textContent = 'Registration failed';
  }
}

async function login() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('errorMessage');
  
  if (!username || !password) {
    errorEl.textContent = 'Please fill all fields';
    return;
  }
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      startGame();
    } else {
      errorEl.textContent = data.error;
    }
  } catch (error) {
    errorEl.textContent = 'Login failed';
  }
}

function startGame() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  socket = io();
  
  socket.emit('join', { 
    username: currentUser.username,
    userId: currentUser.id 
  });
  
  socket.on('init', (data) => {
    playerId = data.playerId;
    worldSize = data.worldSize;
    recipes = data.recipes;
    setupRecipeList();
  });
  
  socket.on('gameState', (state) => {
    gameState = state;
    localPlayer = state.players.find(p => p.id === playerId);
    updateHUD();
  });
  
  socket.on('message', (msg) => {
    addChatMessage('System', msg);
  });
  
  socket.on('chat', (data) => {
    addChatMessage(data.username, data.message);
  });
  
  socket.on('craftResult', (result) => {
    addChatMessage('Crafting', result.message);
  });
  
  setupInputHandlers();
  requestAnimationFrame(gameLoop);
}

function setupInputHandlers() {
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'e') {
      eatFood();
    }
    if (e.key.toLowerCase() === 'c') {
      toggleCrafting();
    }
    if (e.key.toLowerCase() === 'l') {
      toggleLeaderboard();
    }
    if (e.key === 'Enter') {
      const chatInput = document.getElementById('chatInput');
      if (document.activeElement === chatInput) {
        sendChat();
      } else {
        chatInput.focus();
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    mousePos = { x: e.clientX, y: e.clientY };
  });
  
  canvas.addEventListener('click', (e) => {
    handleClick(e.clientX, e.clientY);
  });
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function gameLoop() {
  sendInput();
  render();
  requestAnimationFrame(gameLoop);
}

function sendInput() {
  if (!localPlayer) return;
  
  let vx = 0, vy = 0;
  
  if (keys['w']) vy -= 1;
  if (keys['s']) vy += 1;
  if (keys['a']) vx -= 1;
  if (keys['d']) vx += 1;
  
  if (vx !== 0 || vy !== 0) {
    const length = Math.sqrt(vx * vx + vy * vy);
    vx /= length;
    vy /= length;
  }
  
  socket.emit('input', {
    movement: { x: vx, y: vy }
  });
}

function handleClick(mouseX, mouseY) {
  if (!localPlayer) return;
  
  const worldX = mouseX + camera.x;
  const worldY = mouseY + camera.y;
  
  for (const entity of gameState.entities) {
    const dx = worldX - entity.x;
    const dy = worldY - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < entity.size) {
      socket.emit('input', { action: 'harvest', targetId: entity.id });
      return;
    }
  }
  
  for (const player of gameState.players) {
    if (player.id === playerId) continue;
    
    const dx = worldX - player.x;
    const dy = worldY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < player.size) {
      socket.emit('input', { action: 'attack', targetId: player.id });
      return;
    }
  }
}

function render() {
  if (!localPlayer) return;
  
  camera.x = localPlayer.x - canvas.width / 2;
  camera.y = localPlayer.y - canvas.height / 2;
  
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(-camera.x, -camera.y, worldSize.width, worldSize.height);
  
  const gridSize = 100;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  
  for (let x = 0; x < worldSize.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, -camera.y);
    ctx.lineTo(x - camera.x, worldSize.height - camera.y);
    ctx.stroke();
  }
  
  for (let y = 0; y < worldSize.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-camera.x, y - camera.y);
    ctx.lineTo(worldSize.width - camera.x, y - camera.y);
    ctx.stroke();
  }
  
  for (const entity of gameState.entities) {
    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.arc(entity.x - camera.x, entity.y - camera.y, entity.size, 0, Math.PI * 2);
    ctx.fill();
    
    if (entity.health < entity.maxHealth) {
      const barWidth = entity.size * 2;
      const barHeight = 5;
      const barX = entity.x - camera.x - barWidth / 2;
      const barY = entity.y - camera.y - entity.size - 15;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(barX, barY, barWidth * (entity.health / entity.maxHealth), barHeight);
    }
  }
  
  for (const building of gameState.buildings) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(building.x - camera.x, building.y - camera.y, building.width, building.height);
  }
  
  for (const player of gameState.players) {
    const isLocal = player.id === playerId;
    
    ctx.fillStyle = isLocal ? '#3498db' : '#e74c3c';
    ctx.beginPath();
    ctx.arc(player.x - camera.x, player.y - camera.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.username, player.x - camera.x, player.y - camera.y - player.size - 25);
    
    const barWidth = player.size * 2;
    const barHeight = 5;
    const barX = player.x - camera.x - barWidth / 2;
    const healthBarY = player.y - camera.y - player.size - 15;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, healthBarY, barWidth, barHeight);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(barX, healthBarY, barWidth * (player.health / player.maxHealth), barHeight);
    
    const hungerBarY = player.y - camera.y - player.size - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, hungerBarY, barWidth, barHeight);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(barX, hungerBarY, barWidth * (player.hunger / player.maxHunger), barHeight);
  }
}

function updateHUD() {
  if (!localPlayer) return;
  
  const healthPercent = (localPlayer.health / localPlayer.maxHealth) * 100;
  const hungerPercent = (localPlayer.hunger / localPlayer.maxHunger) * 100;
  
  document.getElementById('healthBar').style.width = healthPercent + '%';
  document.getElementById('hungerBar').style.width = hungerPercent + '%';
  document.getElementById('healthText').textContent = `${Math.round(localPlayer.health)}/${localPlayer.maxHealth}`;
  document.getElementById('hungerText').textContent = `${Math.round(localPlayer.hunger)}/${localPlayer.maxHunger}`;
  
  document.getElementById('woodCount').textContent = localPlayer.inventory.wood;
  document.getElementById('stoneCount').textContent = localPlayer.inventory.stone;
  document.getElementById('foodCount').textContent = localPlayer.inventory.food;
  document.getElementById('ironCount').textContent = localPlayer.inventory.iron;
  
  document.getElementById('toolName').textContent = localPlayer.equipment.tool.replace('_', ' ').toUpperCase();
  document.getElementById('weaponName').textContent = localPlayer.equipment.weapon.replace('_', ' ').toUpperCase();
  document.getElementById('armorName').textContent = localPlayer.equipment.armor.replace('_', ' ').toUpperCase();
  
  document.getElementById('killCount').textContent = localPlayer.kills;
  document.getElementById('scoreCount').textContent = localPlayer.score;
}

function setupRecipeList() {
  const recipeList = document.getElementById('recipeList');
  recipeList.innerHTML = '';
  
  for (const [id, recipe] of Object.entries(recipes)) {
    const item = document.createElement('div');
    item.className = 'recipe-item';
    item.onclick = () => craftItem(id);
    
    const costText = Object.entries(recipe.cost)
      .map(([resource, amount]) => `${resource}: ${amount}`)
      .join(', ');
    
    item.innerHTML = `
      <h4>${recipe.name}</h4>
      <div class="recipe-cost">Cost: ${costText}</div>
    `;
    
    recipeList.appendChild(item);
  }
}

function craftItem(recipeId) {
  socket.emit('craft', recipeId);
}

function eatFood() {
  socket.emit('input', { action: 'eat' });
}

function toggleCrafting() {
  const menu = document.getElementById('craftingMenu');
  menu.classList.toggle('hidden');
}

async function toggleLeaderboard() {
  const menu = document.getElementById('leaderboardMenu');
  menu.classList.toggle('hidden');
  
  if (!menu.classList.contains('hidden')) {
    const response = await fetch('/api/leaderboard');
    const leaderboard = await response.json();
    
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div>
          <span class="leaderboard-rank">#${index + 1}</span>
          <span>${entry.username}</span>
        </div>
        <div>
          <span>Score: ${entry.total_score}</span> |
          <span>Kills: ${entry.kills}</span>
        </div>
      `;
      list.appendChild(item);
    });
  }
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (message) {
    socket.emit('chat', message);
    input.value = '';
  }
  
  input.blur();
}

function addChatMessage(username, message) {
  const messagesDiv = document.getElementById('chatMessages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message';
  msgDiv.innerHTML = `<span class="chat-username">${username}:</span>${message}`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  setTimeout(() => {
    if (messagesDiv.children.length > 50) {
      messagesDiv.removeChild(messagesDiv.firstChild);
    }
  }, 100);
}