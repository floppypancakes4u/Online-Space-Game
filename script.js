const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coordinates');

let target = null;
let actors = [];
let gridSize = 50;
let panX = 0;
let panY = 0;

let isPanning = false;
let lastMouseX, lastMouseY;

// Set canvas size and add resize event listener
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

function setCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawGrid();
}

function drawReticle(actor) {
  let originalLineWidth = ctx.lineWidth; // Save the original line width

  ctx.beginPath();
  ctx.arc(
    actor.x - panX,
    actor.y - panY,
    actor.size + 10,
    0,
    2 * Math.PI,
    false
  );
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '18px Arial';
  ctx.fillStyle = 'white';
  let textX = actor.x - panX + actor.size + 15;
  let textY = actor.y - panY;

  // Adjust text position if it goes beyond the canvas boundaries
  if (textX + 200 > canvas.width) textX = actor.x - panX - actor.size - 215; // 200 is an approx width of the text
  if (textY - 20 < 0) textY = actor.y - panY + 20; // 20 is to give some space from top
  if (textY + 60 > canvas.height) textY = actor.y - panY - 40; // 60 is to give some space from bottom

  ctx.fillText(`Type: ${actor.type}`, textX, textY);
  ctx.fillText(`Size: ${actor.size}`, textX, textY + 20); // add 20 pixels for each new line
  ctx.fillText(`X: ${actor.x.toFixed(3)}`, textX, textY + 40); // add 20 pixels for each new line
  ctx.fillText(`Y: ${actor.y.toFixed(3)}`, textX, textY + 60); // add 20 pixels for each new line
  if (actor instanceof Planet) {
    ctx.fillText(
      `Orbit Speed: ${actor.orbitSpeed.toFixed(3)}`,
      textX,
      textY + 80
    ); // .toFixed(3) to round to 3 decimal places
  }

  ctx.lineWidth = originalLineWidth; // Restore the original line width
}

class Actor {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.type = 'Sun';

    this.children = []; // Other actors that orbit this one
  }

  isUnderCursor(mouseX, mouseY) {
    // Check if the cursor is within the actor's circle
    let dx = mouseX - (this.x - panX);
    let dy = mouseY - (this.y - panY);
    return dx * dx + dy * dy <= this.size * this.size;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x - panX, this.y - panY, this.size, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw all children
    for (let child of this.children) {
      child.draw();
    }
  }

  update() {
    // Update all children
    for (let child of this.children) {
      child.update();
    }
  }
}

class Planet extends Actor {
  constructor(parent, size, color, orbitRadius, orbitSpeed) {
    super(parent.x, parent.y, size, color);

    this.parent = parent;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.type = this.size > 10 ? 'Planet' : 'Moon';
    this.angle = Math.random() * 2 * Math.PI; // Start at a random angle
  }

  update() {
    // Move in a circle around the parent actor
    this.angle += this.orbitSpeed;
    this.x = this.parent.x + this.orbitRadius * Math.cos(this.angle);
    this.y = this.parent.y + this.orbitRadius * Math.sin(this.angle);

    // Update all children
    for (let child of this.children) {
      child.update();
    }
  }
}

class Asteroid extends Planet {
  constructor(parent, size, orbitRadius, orbitSpeed) {
    super(parent, size, 'gray', orbitRadius, orbitSpeed);
    this.type = 'Asteroid';
    this.path = null; // Property to store the shape's path
  }

  generateShape() {
    const path = new Path2D();
    const minShade = 25; // Minimum shade value (0-255) for gray color
    const shadeRange = 50; // Range of shade values (0-255) for gray color
    const grayShade = minShade + Math.floor(Math.random() * shadeRange); // Random gray shade between minShade and minShade + shadeRange
    const color = `rgb(${grayShade}, ${grayShade}, ${grayShade})`;
    this.color = color; // Update the asteroid's color

    for (let i = 0; i < 10; i++) {
      let angle = (i / 10) * 2 * Math.PI;
      let radius = this.size + (Math.random() * this.size - this.size / 2) / 2; // Variate the radius for a jagged appearance
      let x = radius * Math.cos(angle);
      let y = radius * Math.sin(angle);
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.closePath();
    this.path = path; // Save the generated shape's path
  }

  draw() {
    if (!this.path) {
      this.generateShape();
    }
    ctx.save(); // Save the current drawing state
    ctx.translate(this.x - panX, this.y - panY); // Translate the context to the current position of the asteroid
    ctx.fillStyle = this.color;
    ctx.fill(this.path); // Draw the shape using the saved path
    ctx.restore(); // Restore the previous drawing state
  }
}

class Spaceship extends Actor {
  constructor(x, y, size, color) {
    super(x, y, size, color);
    this.type = 'Spaceship';
    this.rotation = 0;
    this.thrust = 0.01;
    this.maxThrust = 0.1;
    this.drag = 0.99;
    this.acceleration = { x: 0, y: 0 };
    this.targetBody = null;
    this.isMoving = false;
    this.velocity = { x: 0, y: 0 };
  }

  rotateLeft() {
    this.rotation -= 0.1;
  }

  rotateRight() {
    this.rotation += 0.1;
  }

  thrustForward() {
    this.thrust = this.maxThrust;
  }

  stopThrust() {
    this.thrust = 0;
  }

  findRandomTarget() {
    const bodies = actors.filter((actor) => actor !== this);
    const randomIndex = Math.floor(Math.random() * bodies.length);
    this.targetBody = bodies[randomIndex];
  }

  update() {
    // Apply rotation
    this.rotation %= Math.PI * 2;

    if (this.isMoving && this.targetBody) {
      // Calculate direction vector
      const dx = this.targetBody.x - this.x;
      const dy = this.targetBody.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply thrust
      const thrustX = (dx / distance) * this.thrust;
      const thrustY = (dy / distance) * this.thrust;
      this.velocity.x += thrustX;
      this.velocity.y += thrustY;

      // Apply drag
      this.velocity.x *= this.drag;
      this.velocity.y *= this.drag;

      // Update position based on velocity
      this.x += this.velocity.x;
      this.y += this.velocity.y;

      // Update rotation based on velocity
      this.rotation = Math.atan2(this.velocity.y, this.velocity.x);

      // Check if reached target
      if (distance <= this.targetBody.size + this.size) {
        this.isMoving = false;
        setTimeout(() => {
          this.findRandomTarget();
          this.isMoving = true;
        }, 3000); // Wait for 3 seconds before moving to the next target
      }
    }

    // Update all children
    for (let child of this.children) {
      child.update();
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x - panX, this.y - panY);
    ctx.rotate(this.rotation);

    // Draw spaceship shape
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw direction indicator line
    ctx.beginPath();
    ctx.moveTo(10, 0); // Starting point of the line
    ctx.lineTo(20, 0); // Ending point of the line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw all children
    for (let child of this.children) {
      child.draw();
    }
  }
}

// Generate Solar Bodies
let sun = new Actor(0, 0, 50, 'yellow');
actors.push(sun);

let planetColors = ['blue', 'green', 'red', 'purple', 'white'];
for (let i = 0; i < 5; i++) {
  let planet = new Planet(
    sun,
    10,
    planetColors[i],
    100 * (i + 1),
    0.0001 * (i + 1)
  );
  sun.children.push(planet);

  // Add random moons to each planet
  let numMoons = Math.floor(Math.random() * 4); // Up to 3 moons
  for (let j = 0; j < numMoons; j++) {
    let moon = new Planet(planet, 5, 'gray', 30 * (j + 1), 0.0002 * (j + 1));
    planet.children.push(moon);
  }
}

// Draw Asteroids
for (let i = 0; i < 100; i++) {
  let asteroid = new Asteroid(
    sun,
    Math.random() * 30 + 10,
    Math.random() * 500 + 200,
    (Math.random() + 0.5) / 1000
  );
  actors.push(asteroid);
}

// Remove the existing spaceship and create a new Spaceship instance
let spaceship = new Spaceship(100, 0, 15, 'cyan');
actors.push(spaceship);

// Generate random target for the spaceship
spaceship.findRandomTarget();
spaceship.isMoving = true;

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'lightgrey'; // change grid line color to light grey

  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x - (panX % gridSize), 0);
    ctx.lineTo(x - (panX % gridSize), canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y - (panY % gridSize));
    ctx.lineTo(canvas.width, y - (panY % gridSize));
    ctx.stroke();
  }

  // Draw all actors
  for (let actor of actors) {
    actor.draw();
  }

  // Draw the targeting reticle and dotted line
  if (target !== null) {
    drawReticle(target);

    //if (spaceship.targetBody === target) {
    if (target.type === 'Spaceship') {
      drawFlashingReticle(spaceship, spaceship.targetBody);

      ctx.beginPath();
      ctx.moveTo(spaceship.x - panX, spaceship.y - panY);
      ctx.lineTo(target.x - panX, target.y - panY);
      ctx.strokeStyle = 'white';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
    }
  }
}

function checkActorAndDescendants(actor, mouseX, mouseY) {
  if (actor.isUnderCursor(mouseX, mouseY)) {
    return actor;
  }

  for (let child of actor.children) {
    let result = checkActorAndDescendants(child, mouseX, mouseY);
    if (result) {
      return result;
    }
  }

  return null;
}

function drawFlashingReticle(sourceActor, targetActor) {
  let originalLineWidth = ctx.lineWidth;

  ctx.beginPath();
  ctx.arc(
    targetActor.x - panX,
    targetActor.y - panY,
    targetActor.size + 20,
    0,
    2 * Math.PI,
    false
  );

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.strokeStyle = 'yellow';
    ctx.setLineDash([]);
    ctx.moveTo(sourceActor.x - panX, sourceActor.y - panY);
    ctx.lineTo(targetActor.x - panX, targetActor.y - panY);
    ctx.strokeStyle = 'yellow';
    ctx.setLineDash([5, 5]);
  } else {
    ctx.strokeStyle = 'transparent';
    ctx.setLineDash([5, 5]);
  }

  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.lineWidth = originalLineWidth;
}

function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const worldX = mouseX + panX;
  const worldY = mouseY + panY;

  coordDisplay.textContent = `X: ${worldX}, Y: ${worldY}`;

  if (isPanning) {
    panX += lastMouseX - mouseX;
    panY += lastMouseY - mouseY;
  }

  lastMouseX = mouseX;
  lastMouseY = mouseY;

  drawGrid();

  // Draw target reticle on mouse over
  target = null;
  for (let actor of actors) {
    target = checkActorAndDescendants(actor, mouseX, mouseY);
    if (target) {
      break;
    }
  }
}

function mouseDown(e) {
  if (e.button === 2) {
    isPanning = true;
  }
}

function mouseUp(e) {
  if (e.button === 2) {
    isPanning = false;
  }
}

function update() {
  // Update all actors
  for (let actor of actors) {
    actor.update();
  }
}

// Add update to the event listeners
canvas.addEventListener('mousemove', (e) => {
  mouseMove(e);
});
canvas.addEventListener('mousedown', (e) => {
  mouseDown(e);
});
canvas.addEventListener('mouseup', (e) => {
  mouseUp(e);
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

function gameLoop() {
  update();
  drawGrid();
  window.requestAnimationFrame(gameLoop);
}

// Start the game loop
window.requestAnimationFrame(gameLoop);
