import { SectorManager } from './sectors.js';
import { savePathData } from './canvas.js';

let asteroidShapes = [];

export function initActors() {
  generateAsteroidShapes();
}

function generateAsteroidPoints(size) {
  const points = [];
  for (let j = 0; j < 10; j++) {
    let angle = (j / 10) * 2 * Math.PI;
    let radius = size + (Math.random() * size - size / 2) / 2;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}

function createPathFromPoints(points, scale = 1) {
  const path = new Path2D();
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i];
    if (i === 0) {
      path.moveTo(x * scale, y * scale);
    } else {
      path.lineTo(x * scale, y * scale);
    }
  }
  path.closePath();
  return path;
}
function generateAsteroidShapes() {
  for (let i = 0; i < 50; i++) {
    const size = 10 + Math.random() * 20;
    const asteroidPoints = generateAsteroidPoints(size);
    const minShade = 25;
    const shadeRange = 50;
    const grayShade = minShade + Math.floor(Math.random() * shadeRange);
    const color = `rgb(${grayShade}, ${grayShade}, ${grayShade})`;
    for (let scale = 1.0; scale >= 0.1; scale -= 0.1) {
      const scaledPath = createPathFromPoints(asteroidPoints, scale);
      savePathData('Asteroid', i, scale, scaledPath, color);
    }

    asteroidShapes.push(i);
  }
}

function getRandomElement(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('The input must be a non-empty array');
  }
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

export class Actor {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.type = 'Sun';
    this.currentSector = null;
    this.children = [];
    this.name = `${this.constructor.name}-${Math.floor(Math.random() * 10000)}`;

    //console.log(`${this.name} created`);
  }

  isInCurrentSector() {
    return this.currentSector && this.currentSector.isActorWithinBounds(this);
  }

  isUnderCursor(mouseX, mouseY) {
    let dx = mouseX - (this.x - panX);
    let dy = mouseY - (this.y - panY);
    return dx * dx + dy * dy <= this.size * this.size;
  }

  isVisible(canvasWidth, canvasHeight, panX, panY) {
    const left = this.x - this.size - panX;
    const right = this.x + this.size - panX;
    const top = this.y - this.size - panY;
    const bottom = this.y + this.size - panY;

    return left < canvasWidth && right > 0 && top < canvasHeight && bottom > 0;
  }

  draw(ctx, panX, panY) {
    ctx.beginPath();
    ctx.arc(this.x - panX, this.y - panY, this.size, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();

    for (let child of this.children) {
      child.draw(ctx, panX, panY);
    }
  }

  movementCheck() {
    if (!this.isInCurrentSector()) {
      SectorManager.addActor(this);
    }
  }

  update() {
    this.customUpdate(); // A method for additional updates specific to the actor type

    for (let child of this.children) {
      child.update();
    }

    this.movementCheck();
  }

  customUpdate() {
    // Default implementation does nothing, to be overridden by subclasses
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    SectorManager.addActor(this);
  }
}

export class Planet extends Actor {
  constructor(parent, size, color, orbitRadius, orbitSpeed) {
    super(parent.x, parent.y, size, color);

    this.parent = parent;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.type = this.size > 10 ? 'Planet' : 'Moon';
    this.angle = Math.random() * 2 * Math.PI; // Start at a random angle
  }

  customUpdate() {
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

export class Asteroid extends Planet {
  constructor(parent, size, orbitRadius, orbitSpeed) {
    super(parent, size, 'gray', orbitRadius, orbitSpeed);
    this.type = 'Asteroid';
    const randomShapeId = getRandomElement(asteroidShapes);
    this.shapeId = randomShapeId;
    this.shape = asteroidShapes[randomShapeId];
  }
}

export class Spaceship extends Actor {
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

  customUpdate() {
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

    // // Update all children
    // for (let child of this.children) {
    //   child.update();
    // }

    // super.update();
  }

  draw(ctx, panX, panY) {
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
      child.draw(ctx, panX, panY);
    }
  }
}

export var actors = []; // Array to store all actors
