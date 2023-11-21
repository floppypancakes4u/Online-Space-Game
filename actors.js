// Import statements
import { SectorManager } from './sectors.js';
import { savePathData, drawReticle } from './canvas.js';

// Variables
let asteroidShapes = [];
export const actorTypes = {
  ASTEROID: 'Asteroid',
  SHIP: 'Space Ship',
  SUN: 'Sun',
  PLANET: 'Planet',
  MOON: 'Moon',
  STATION: 'Station',
  CONTAINER: 'Container',
};
export var actors = {}; // Array to store all actors

export function initActors() {
  generateAsteroidShapes();
}

// Functions
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
      savePathData(actorTypes.ASTEROID, i, scale, scaledPath, color);
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

// Classes
export class Actor {
  constructor(x, y, size, color) {
    this.ID = `${this.constructor.name}-${Math.floor(
      Math.random() * 10000
    )}-${Date.now()}`;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.rotation = 0;
    this.type = 'Sun';
    this.currentSector = null;
    this.children = [];
    this.name = `${this.constructor.name}-${Math.floor(Math.random() * 10000)}`;
    this.velocity = { x: 0, y: 0 };
    this.isThrusting = false;
    this.autopilot = false;
    this.targetPosition = { x: 0, y: 0 };
    actors[this.ID] = this;
  }

  distanceTo(otherActor) {
    const dx = this.x - otherActor.x;
    const dy = this.y - otherActor.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setAutopilotTarget(target, x = null, y = null) {
    if (target instanceof Actor) {
      this.targetActor = target;
      this.autopilot = true;
      this.targetPosition = null; // Clear direct coordinates when using an actor as a target
    } else if (x !== null && y !== null) {
      this.targetPosition = { x, y };
      this.autopilot = true;
      this.targetActor = null; // Clear target actor when using direct coordinates
    }
  }

  disableAutopilot() {
    this.autopilot = false;
    this.targetPosition = null;
    this.targetActor = null;
  }

  rotateLeft(pressed) {
    if (pressed) this.rotation -= 0.1;
  }

  rotateRight(pressed) {
    if (pressed) this.rotation += 0.1;
  }

  thrustForward(pressed) {
    this.isThrusting = pressed;
  }

  stopThrust(pressed) {
    this.isBreaking = pressed;
  }

  isInCurrentSector() {
    return this.currentSector && this.currentSector.isActorWithinBounds(this);
  }

  isUnderCursor(mouseX, mouseY, panX, panY) {
    let dx = mouseX - (this.x - panX);
    let dy = mouseY - (this.y - panY);
    let isUnder = dx * dx + dy * dy <= this.size * this.size;

    return isUnder;
  }

  getSpeed() {
    return (
      Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      ) * 23
    );
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

  navigateTowardsTarget() {
    let targetX, targetY;

    // Check if navigating towards another Actor
    if (this.targetActor) {
      targetX = this.targetActor.x;
      targetY = this.targetActor.y;
    } else if (this.targetPosition) {
      targetX = this.targetPosition.x;
      targetY = this.targetPosition.y;
    } else {
      // No target set
      return;
    }

    // Calculate the angle towards the target
    const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);

    // Adjust rotation to face the target
    if (this.rotation < targetAngle) {
      this.rotateRight(true);
    } else if (this.rotation > targetAngle) {
      this.rotateLeft(true);
    }

    // Calculate the distance to the target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    //const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    const distanceToTarget = this.distanceTo({ x: targetX, y: targetY });

    // Threshold for stopping the autopilot (e.g., when within 5 units of the target)
    const stopThreshold = 5;

    // If within stopping threshold, stop the autopilot
    if (distanceToTarget <= stopThreshold) {
      this.disableAutopilot();
      this.thrustForward(false);
      return;
    }

    // Threshold for starting to decelerate (e.g., start slowing down 50 units from the target)
    const decelerationThreshold = 50;

    // Engage thrust if not facing the target directly and far enough from the target
    const angleDifference = Math.abs(this.rotation - targetAngle);
    if (angleDifference < 0.1 && distanceToTarget > decelerationThreshold) {
      // If far from the target, full thrust
      this.thrustForward(true);
    } else if (
      angleDifference < 0.1 &&
      distanceToTarget <= decelerationThreshold
    ) {
      // If near the target, decelerate
      this.thrustForward(false);
      this.applyDeceleration();
    } else {
      // If not aligned with target, stop thrusting
      this.thrustForward(false);
    }
  }

  applyDeceleration() {
    const decelerationFactor = 0.95;
    this.velocity.x *= decelerationFactor;
    this.velocity.y *= decelerationFactor;
  }
}

export class SolarBody extends Actor {
  constructor(x, y, size, color) {
    super(x, y, size, color);
  }
}

export class Sun extends SolarBody {
  constructor(x, y, size, color) {
    super(x, y, size, color);
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
    this.MaxSpeed = 55;
    this.thrust = 0.1;
    this.drag = 0.99;
    this.acceleration = { x: 0, y: 0 };
    this.targetBody = null;
    this.radarContacts = [];
    this.visualContacts = [];

      this.checkActorContacts(this.getRadarRange(), this.getVisualRange());
  }

  getRadarRange() {
    return 250;
  }

  getVisualRange() {
    return 450;
  }

  checkActorContacts(radarRange = 50, visualRange = 50) {

    for (const [ID, actor] of Object.entries(actors)) {
      const range = this.distanceTo(actor);
  
      // Check for addition to radarContacts
      if (range <= radarRange) {
          if (actor != this && !this.radarContacts.includes(actor)) {
              this.radarContacts.push(actor);
              const event = new CustomEvent('RadarContactUpdate', {
                detail: { type: "radarContact", action: "add", actor }
              });
              document.dispatchEvent(event);
          }
      } else {
          // Remove from radarContacts if out of range
          const index = this.radarContacts.indexOf(actor);
          if (index > -1) {
              this.radarContacts.splice(index, 1);
              const event = new CustomEvent('RadarContactUpdate', {
                detail: { type: "radarContact", action: "remove", actor }
              });
              document.dispatchEvent(event);
          }
      }
  
      // Check for addition to visualContacts
      if (range <= visualRange) {
          if (actor != this && !this.visualContacts.includes(actor)) {
              this.visualContacts.push(actor);
              const event = new CustomEvent('RadarContactUpdate', {
                detail: { type: "visualContact", action: "add", actor }
              });
              document.dispatchEvent(event);
          }
      } else {
          // Remove from visualContacts if out of range
          const index = this.visualContacts.indexOf(actor);
          if (index > -1) {
              this.visualContacts.splice(index, 1);
              const event = new CustomEvent('RadarContactUpdate', {
                detail: { type: "visualContact", action: "remove", actor }
              });
              document.dispatchEvent(event);
          }
      }
  }
  

    setTimeout(() => {
      this.checkActorContacts(this.getRadarRange(), this.getVisualRange());
    }, 250);

  }

  findRandomTarget() {
    const bodies = actors.filter((actor) => actor !== this);
    const randomIndex = Math.floor(Math.random() * bodies.length);
    this.targetBody = bodies[randomIndex];
  }

  HandleShipMovement() {
    // Apply rotation
    this.rotation %= Math.PI * 2;

    if (this.isThrusting && !this.isBreaking) {
      // Calculate thrust direction based on rotation
      const thrustDirectionX = Math.cos(this.rotation);
      const thrustDirectionY = Math.sin(this.rotation);

      // Apply thrust in the direction of rotation
      this.velocity.x += thrustDirectionX * this.thrust;
      this.velocity.y += thrustDirectionY * this.thrust;
    }

    if (this.isBreaking) {
      // Apply deceleration
      this.velocity.x *= 1 - this.thrust * 0.1;
      this.velocity.y *= 1 - this.thrust * 0.1;

      // Ensure velocity doesn't go below zero
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
    }

    const currentSpeed = this.getSpeed(); // getSpeed() method from Actor class
    if (currentSpeed > this.MaxSpeed) {
      // Calculate the scaling factor
      const scalingFactor = this.MaxSpeed / currentSpeed;

      // Scale down the velocity components
      this.velocity.x *= scalingFactor;
      this.velocity.y *= scalingFactor;
    }

    // If we want a drag effect later.. here ya go
    // this.velocity.x *= this.drag;
    // this.velocity.y *= this.drag;

    // Update position based on the current velocity
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  customUpdate() {
    if (this.autopilot) {
      this.navigateTowardsTarget();
    }

    this.HandleShipMovement();
    drawReticle({ actor: this, color: 'yellow', style: 'dotted', size: this.getRadarRange(), showText: false });
    drawReticle({ actor: this, color: 'orange', style: 'dashed', size: this.getVisualRange(), showText: false });

    this.radarContacts.forEach((contact) => {
      drawReticle({ actor: contact, color: 'yellow', style: 'dotted', showText: false });
    });

    // Other existing code...
  }
}

console.log('Actors Loaded');
