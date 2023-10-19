import { SectorManager } from './sectors.js';

export class Actor {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.type = 'Sun';
    this.currentSector = null;
    this.children = []; // Other actors that orbit this one
    this.name = `${this.constructor.name}-${Math.floor(Math.random() * 10000)}`; // Using the class name and a random number between 0 and 9999

    console.log(`${this.name} created`);
  }

  isInCurrentSector() {
    return this.currentSector && this.currentSector.isWithinBounds(this);
  }

  isUnderCursor(mouseX, mouseY) {
    // Check if the cursor is within the actor's circle
    let dx = mouseX - (this.x - panX);
    let dy = mouseY - (this.y - panY);
    return dx * dx + dy * dy <= this.size * this.size;
  }

  draw(ctx, panX, panY) {
    console.log('stuff:', ctx, panX, panY);
    ctx.beginPath();
    ctx.arc(this.x - panX, this.y - panY, this.size, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw all children
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
    // Update all children
    for (let child of this.children) {
      child.update();
    }

    this.movementCheck();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    SectorManager.addActor(this); // Update the actor's sector when its position changes
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

  update() {
    // Move in a circle around the parent actor
    this.angle += this.orbitSpeed;
    this.x = this.parent.x + this.orbitRadius * Math.cos(this.angle);
    this.y = this.parent.y + this.orbitRadius * Math.sin(this.angle);

    // Update all children
    for (let child of this.children) {
      child.update();
    }

    super.update();
  }
}

export class Asteroid extends Planet {
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

  draw(ctx, panX, panY) {
    if (!this.path) {
      this.generateShape();
    }
    ctx.save(); // Save the current drawing state
    ctx.translate(this.x - panX, this.y - panY); // Translate the context to the current position of the asteroid
    ctx.fillStyle = this.color;
    ctx.fill(this.path); // Draw the shape using the saved path
    ctx.restore(); // Restore the previous drawing state
  }

  update() {
    super.update();
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

    super.update();
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

export const actors = []; // Array to store all actors
