
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;
canvas.style.border = "2px solid #222";
canvas.style.backgroundColor = "#e3f2fd";
canvas.style.display = "block";
canvas.style.margin = "40px auto";

let playerId = null;
let players = {};
let bullets = [];
let safeZone = { x: 400, y: 300, radius: 250 };
let kills = {};
let canShoot = true;

const shootSound = new Audio("shoot.mp3");
let showDeathScreen = false;
let showWinScreen = false;
let lastMouse = { x: 0, y: 0 };
let gameStarted = false;


const scoreboard = document.createElement("div");
scoreboard.style.position = "absolute";
scoreboard.style.right = "20px";
scoreboard.style.top = "20px";
scoreboard.style.backgroundColor = "rgba(0,0,0,0.7)";
scoreboard.style.color = "white";
scoreboard.style.padding = "10px";
scoreboard.style.fontFamily = "Arial";
scoreboard.style.borderRadius = "8px";
scoreboard.style.fontSize = "14px";
document.body.appendChild(scoreboard);

const minimap = document.createElement("canvas");
minimap.width = 200;
minimap.height = 150;
minimap.style.position = "absolute";
minimap.style.left = "20px";
minimap.style.top = "20px";
minimap.style.border = "2px solid #222";
minimap.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
minimap.style.borderRadius = "8px";
document.body.appendChild(minimap);
const minimapCtx = minimap.getContext("2d");

document.addEventListener("DOMContentLoaded", () => {

  const startScreen = document.createElement("div");
  startScreen.style.position = "absolute";
  startScreen.style.top = 0;
  startScreen.style.left = 0;
  startScreen.style.width = "100%";
  startScreen.style.height = "100%";
  startScreen.style.backgroundColor = "#111";
  startScreen.style.color = "#fff";
  startScreen.style.display = "flex";
  startScreen.style.flexDirection = "column";
  startScreen.style.alignItems = "center";
  startScreen.style.justifyContent = "center";
  startScreen.innerHTML = `
    <h1 style="margin-bottom: 20px;">🎮 2D Battle Royale</h1>
    <button id="startBtn" style="padding: 10px 20px; font-size: 18px;">Start Game</button>
  `;
  document.body.appendChild(startScreen);

  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameStarted = true;
  });
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  lastMouse = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
});

document.addEventListener("keydown", (e) => {
  if (!gameStarted || showDeathScreen) return;
  const p = players[playerId];
  if (!p) return;

  if (e.key === "w") socket.emit("move", { dx: 0, dy: -1 });
  if (e.key === "a") socket.emit("move", { dx: -1, dy: 0 });
  if (e.key === "s") socket.emit("move", { dx: 0, dy: 1 });
  if (e.key === "d") socket.emit("move", { dx: 1, dy: 0 });

  if (e.code === "Space" && canShoot) {
    const dx = lastMouse.x - p.x;
    const dy = lastMouse.y - p.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      socket.emit("shoot", { dx: dx / mag, dy: dy / mag });
      shootSound.currentTime = 0;
      shootSound.play();
      canShoot = false;
      setTimeout(() => (canShoot = true), 500);
    }
  }
});

socket.on("connect", () => {
  playerId = socket.id;
});

socket.on("updatePlayers", (data) => {
  players = data;
});

socket.on("updateKills", (data) => {
  kills = data;
});

socket.on("updateBullets", (data) => {
  bullets = data;
});

socket.on("updateSafeZone", (zone) => {
  safeZone = zone;
});

socket.on("playerEliminated", () => {
  showDeathScreen = true;
});

socket.on("playerWon", () => {
  showWinScreen = true;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!gameStarted) return requestAnimationFrame(draw);


  ctx.beginPath();
  ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 128, 0, 0.4)";
  ctx.lineWidth = 6;
  ctx.stroke();


  if (players[playerId]) {
    const dx = players[playerId].x - safeZone.x;
    const dy = players[playerId].y - safeZone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > safeZone.radius - 20) {
      ctx.fillStyle = "#ffc107";
      ctx.font = "bold 20px Arial";
      ctx.fillText("⚠️ Return to Safe Zone!", canvas.width / 2 - 100, 30);
    }
  }


  let scores = [];
  for (let id in players) {
    const p = players[id];
    // Draw human shape instead of circle
    ctx.fillStyle = id === playerId ? "#0d47a1" : "#c62828";

    // Draw body
    ctx.fillRect(p.x - 7, p.y - 10, 14, 20);

    // Draw head
    ctx.beginPath();
    ctx.arc(p.x, p.y - 15, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar
    ctx.fillStyle = "#222";
    ctx.fillRect(p.x - 15, p.y - 30, 30, 5);
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(p.x - 15, p.y - 30, (p.health / 100) * 30, 5);

    scores.push({ id, health: p.health });
  }


  ctx.fillStyle = "#ff0000";
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  minimapCtx.clearRect(0, 0, minimap.width, minimap.height);

  minimapCtx.beginPath();
  const scaleX = minimap.width / canvas.width;
  const scaleY = minimap.height / canvas.height;
  minimapCtx.arc(safeZone.x * scaleX, safeZone.y * scaleY, safeZone.radius * scaleX, 0, Math.PI * 2);
  minimapCtx.strokeStyle = "rgba(0, 128, 0, 0.6)";
  minimapCtx.lineWidth = 3;
  minimapCtx.stroke();

 
  for (let id in players) {
    const p = players[id];
    minimapCtx.fillStyle = id === playerId ? "#0d47a1" : "#c62828";
    minimapCtx.beginPath();
    minimapCtx.arc(p.x * scaleX, p.y * scaleY, 5, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  


  scoreboard.innerHTML = `<b>Scoreboard</b><br>` +
    scores
      .sort((a, b) => (kills[b.id] || 0) - (kills[a.id] || 0))
      .map((s, i) => `${i + 1}. ${s.id === playerId ? "<b>You</b>" : "Player"} - Kills: ${kills[s.id] || 0} - HP: ${s.health}`)
      .join("<br>");

  if (showDeathScreen) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Arial";
    ctx.fillText("☠️ You Died ☠️", canvas.width / 2 - 120, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press F5 to restart", canvas.width / 2 - 90, canvas.height / 2 + 40);
  }

  if (showWinScreen) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gold";
    ctx.font = "bold 50px Arial";
    ctx.fillText("🏆 You Won! 🏆", canvas.width / 2 - 130, canvas.height / 2);
    ctx.font = "24px Arial";
    ctx.fillText("Press F5 to play again", canvas.width / 2 - 110, canvas.height / 2 + 50);
  }

  requestAnimationFrame(draw);
}

draw();
