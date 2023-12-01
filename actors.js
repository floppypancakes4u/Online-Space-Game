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
  constructor({
    x = 0,
    y = 0,
    size = 1,
    color = 'black',
    rotation = 0,
    type = 'Sun',
    velocity = { x: 0, y: 0 },
    maxLifetime = 0,
    path = null,
  } = {}) {
    this.ID = `${this.constructor.name}-${Math.floor(
      Math.random() * 10000
    )}-${Date.now()}`;
    this.x = x;
    this.y = y;    
    this.startPos = { x, y };
    this.size = size;
    this.color = color;
    this.rotation = rotation;
    this.type = type;
    this.currentSector = null;
    this.children = [];
    this.name = this.ID;
    this.velocity = velocity;
    this.isThrusting = false;
    this.spacePressed = false;
    this.autopilot = false;
    this.targetPosition = { x: 0, y: 0 };
    this.selected = false;
    this.maxLifetime = maxLifetime;
    this.path = path;
    this.hullHealth = 5;
    this.markedForDestruction = false;
    actors[this.ID] = this;

    this.init();
  }

  init() {
    const _ = this;
    document.addEventListener('World:ActorDestroyed', function (event) {
      const { actor } =
        event.detail;
      _.otherActorDestroyed(actor);
      //console.log("Actor Deleted: ", actor);
    });
  }

  applyDamage(projectile) {
    //console.log("applyDamage", projectile)
    if (projectile.type == 'kinetic') {
      this.hullHealth -= projectile.kineticDamage;
    }

    if (this.hullHealth <= 0) this.destroy();
  }

  setPath(path) {
    this.path = path;
  }

  destroy() {
    if (this.markedForDestruction) return;

    const destroyedActorEvent = new CustomEvent('World:ActorDestroyed', {
      detail: {
        actor: this,
      },
    });
    document.dispatchEvent(destroyedActorEvent);

    //console.log("destroying self: ", this)
    delete actors[this.ID];

    // *** TESTING *** //

    this.isActive = false;
    //console.log("Destroyed: ", this.constructor.name, this.distanceTo(this.startPos))

    // *** TESTING *** //
    
    this.markedForDestruction = true;
  }

  otherActorDestroyed(actor) {

  }

  setMaxLifetime(lifetime) {
    this.maxLifetime = 0;
  }

  setSelected(selected) {
    this.selected = selected;
  }

  distanceTo(otherActor) {
    const dx = this.x - otherActor.x;
    const dy = this.y - otherActor.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  collidesWith(actor) {
    // Get the bounding boxes of the paths
    const path1BoundingBox = this.path.getBoundingClientRect();
    const path2BoundingBox = actor.path.getBoundingClientRect();

    // Bounding box check
    if (
      path1BoundingBox.right < path2BoundingBox.left ||
      path1BoundingBox.left > path2BoundingBox.right ||
      path1BoundingBox.bottom < path2BoundingBox.top ||
      path1BoundingBox.top > path2BoundingBox.bottom
    ) {
      // Bounding boxes do not intersect, no collision
      return false;
    }

    // Point-in-Path test
    const ctx = document.createElement('canvas').getContext('2d');
    // Add path1 to the context
    ctx.addPath(this.path);

    // Iterate through points in path2 and test if they are inside path1
    for (let x = path2BoundingBox.left; x <= path2BoundingBox.right; x++) {
      for (let y = path2BoundingBox.top; y <= path2BoundingBox.bottom; y++) {
        if (ctx.isPointInPath(x, y)) {
          // Found a point inside path1, there is a collision
          return true;
        }
      }
    }

    // No collision found
    return false;
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

  space(pressed) {
    this.spacePressed = pressed;
  }

  isInCurrentSector() {
    return this.currentSector && this.currentSector.isActorWithinBounds(this);
  }

  isUnderCursor(x, y) {
    // let dx = x - (this.x - panX);
    // let dy = y - (this.y - panY);
    // let isUnder = dx * dx + dy * dy <= this.size * this.size;

    //return isUnder;
    const dx = x - this.x;
    const dy = y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.size;
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

  update(deltaTime) {
    this.customUpdate(deltaTime); // A method for additional updates specific to the actor type

    // for (let child of this.children) {
    //   child.update();
    // }

    this.movementCheck();
  }

  customUpdate(deltaTime) {
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

export class Equipment extends Actor {
  constructor({ x, y, size, color, activeEventHandler = null } = {}) {
    super({ x, y, size, color });
    this.activeEventHandler = activeEventHandler;
    this.controlled = false;
  }

  activate() {}

  deactivate() {}

  setControlled(state) {
    this.controlled = state;
  }
}

export class Hardpoint extends Equipment {
  constructor(options = {}) {
    super(options);
  }
}

export class WeaponHardpoint extends Hardpoint {
  constructor(options = {}) {
    super(options);
  }
}

export class ProjectileTurret extends WeaponHardpoint {
  constructor(options = {}) {
    super(options);
    const {
      x = 0,
      y = 0,
      amount = 1,
      recoil = 0.05,
      range = 788,
      accuracy = 25,
      offsetX = 5,
      offsetY = 5,
      existsInWorld = false,
      owningActor = null,
    } = options;

    this.ID = `${this.constructor.name}-${Math.floor(
      Math.random() * 10000
    )}-${Date.now()}`;
    this.x = x;
    this.y = y;
    this.recoil = recoil;
    this.amount = amount;
    this.range = range;
    this.accuracy = accuracy;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.existsInWorld = existsInWorld;
    this.owningActor = owningActor;

    console.log(options);
  }

  setAttachedWorldPosition(parentActor) {
    if (!this.existsInWorld) return;

    // Calculate the offset based on the parentActor's rotation
    const offsetXRotated =
      this.offsetX * Math.cos(parentActor.rotation) -
      this.offsetY * Math.sin(parentActor.rotation);
    const offsetYRotated =
      this.offsetX * Math.sin(parentActor.rotation) +
      this.offsetY * Math.cos(parentActor.rotation);

    // Set the turret's position based on the rotated offset and parentActor's position
    this.x = parentActor.x + offsetXRotated;
    this.y = parentActor.y + offsetYRotated;
    this.rotation = parentActor.rotation;
  }

  setActive(active) {
    if (active) {
      if (this.activeEventHandler === null) {
        this.activeEventHandler = setInterval(() => {
          this.fireWeapon();
        }, this.recoil * 1000);

        //console.log('Activated Turret');
      }
    } else {
      if (this.activeEventHandler) {
        clearInterval(this.activeEventHandler);
        this.activeEventHandler = null;
        //console.log('De-Activated Turret');
      }
    }
  }

  fireWeapon() {
    new Projectile({
      ship: this,
      x: this.x,
      y: this.y,
      color: 'red',
      rotation: addRandomSpread(this.rotation, this.accuracy),
      range: Math.min(this.range, this.owningActor.getRadarRange()),
      radarContacts: this.owningActor.radarContacts,
    });
  }
}

export class Projectile extends Actor {
  constructor({
    x = 0,
    y = 0,
    color = 'grey',
    rotation = 0,
    bulletLength = 15,
    bulletWidth = 2,
    ship = null,
    speed = 10,
    range = 1000,
    type = 'kinetic',
    kineticDamage = 1,
    radarContacts = [],
  } = {}) {
    super({ x, y, color }); // size is not included as per your requirement
    this.rotation = rotation;
    this.bulletLength = bulletLength;
    this.bulletWidth = bulletWidth;
    this.speed = speed + (ship ? ship.getSpeed() : 0);
    this.killDistance = range;
    this.type = 'kinetic';
    this.kineticDamage = kineticDamage;
    this.radarContacts = radarContacts;
    this.checkIteration = 0;
    this.active = true;

    this.removeOutOfRangeActors();
  }

  removeOutOfRangeActors() {
    const remainingDistance = this.getRemainingDistance();
    this.radarContacts = this.radarContacts.filter((contact) => {
      const distanceToContact = this.distanceTo(contact);
      return distanceToContact <= remainingDistance;
    });
  }

  checkRadarContactsDistance() {
    // Increment the call count
    this.checkIteration++;

    // Check every 10 times this method is called
    if (this.checkIteration % 4 !== 0) {
      return; // Skip the check if it's not the 10th call
    }

    this.removeOutOfRangeActors();

    // Perform the distance check for each radar contact
    //const remainingDistance = this.getRemainingDistance(); // Assuming you have this method
    this.radarContacts.forEach((contact) => {
      const distanceToContact = this.distanceTo(contact); // Assuming you have this method
      if (distanceToContact < 35 && contact instanceof Projectile == false && contact instanceof Hardpoint == false) {
        console.log("Contacted: ", contact.constructor.name, distanceToContact)
        contact.applyDamage(this);
        this.destroy();
      }
    });
  }

  getRemainingDistance() {
    return this.killDistance - this.distanceTo(this.startPos);
  }

  HandleMovement() {
    // Apply rotation
    this.rotation %= Math.PI * 2;

    // Apply thrust in the direction of rotation
    this.velocity.x = Math.cos(this.rotation) * this.speed;
    this.velocity.y = Math.sin(this.rotation) * this.speed;

    // Update position based on the current velocity
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;

    const range = this.distanceTo(this.startPos);
    //console.log(range, this.killDistance)
    if (range >= this.killDistance) this.destroy();
  }

  customUpdate(deltaTime) {
    if (this.isActive == false) return;
    this.HandleMovement();
    this.checkRadarContactsDistance();
  }
}

export class SolarBody extends Actor {
  constructor(options = {}) {
    super(options);
  }
}

export class Sun extends SolarBody {
  constructor(options = {}) {
    super(options);
  }
}

export class Planet extends Actor {
  constructor({
    parent,
    size,
    color,
    orbitRadius,
    orbitSpeed,
    angle = Math.random() * 2 * Math.PI, // Start at a random angle
  } = {}) {
    if (parent) {
      super({ x: parent.x, y: parent.y, size, color });
    } else {
      super({ size, color });
    }
    this.parent = parent;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.type = size > 10 ? 'Planet' : 'Moon';
    this.angle = angle;
  }

  customUpdate(deltaTime) {
    // Move in a circle around the parent actor
    this.angle += this.orbitSpeed;
    this.x = this.parent.x + this.orbitRadius * Math.cos(this.angle);
    this.y = this.parent.y + this.orbitRadius * Math.sin(this.angle);

    // Update all children
    // for (let child of this.children) {
    //   child.update();
    // }
  }
}

export class Asteroid extends Planet {
  constructor({
    parent,
    size,
    orbitRadius,
    orbitSpeed,
    color = 'gray',
    type = 'Asteroid',
    shapeId = getRandomElement(asteroidShapes),
    shape = asteroidShapes[shapeId],
  } = {}) {
    super({ parent, size, color, orbitRadius, orbitSpeed });
    this.type = type;
    this.shapeId = shapeId;
    this.shape = shape;
  }
}

export class Spaceship extends Actor {
  constructor({
    x,
    y,
    size,
    color,
    MaxSpeed = 55,
    thrust = 0.1,
    drag = 0.99,
    acceleration = { x: 0, y: 0 },
    targetBody = null,
  } = {}) {
    super({ x, y, size, color });
    this.type = 'Spaceship';
    this.MaxSpeed = MaxSpeed;
    this.thrust = thrust;
    this.drag = drag;
    this.acceleration = acceleration;
    this.targetBody = targetBody;
    this.radarContacts = [];
    this.hardpoints = [];
    this.effectiveRadarRange = 700;
    this.weaponSelectionIndex = 0;

    console.log('This ship: ', this);
    this.addHardpoint(
      new ProjectileTurret({
        offsetX: -19,
        offsetY: 12,
        existsInWorld: true,
        owningActor: this,
      })
    );

    this.addHardpoint(
      new ProjectileTurret({
        offsetX: -19,
        offsetY: -12,
        existsInWorld: true,
        owningActor: this,
      })
    );

    this.checkActorContacts(this.getRadarRange());
  }  

  otherActorDestroyed(actor) {
    this.removeContact(actor);
  }

  addHardpoint(newEquipment) {
    this.hardpoints.push(newEquipment);
  }

  getRadarRange() {
    return this.effectiveRadarRange;
  }

  checkActorContacts(radarRange = 50) {
    for (const [ID, actor] of Object.entries(actors)) {
      const range = this.distanceTo(actor);

      if (actor != this) {
        // Check for addition to radarContacts
        if (range <= radarRange && actor instanceof Projectile == false) {
          if (!this.radarContacts.includes(actor)) {
            this.radarContacts.push(actor);
            const event = new CustomEvent('RadarContactUpdate', {
              detail: { type: 'radarContact', action: 'add', actor },
            });
            document.dispatchEvent(event);
          }
        } else {
          // Remove from radarContacts if out of range
          // const index = this.radarContacts.indexOf(actor);
          // if (index > -1) {
          //   this.radarContacts.splice(index, 1);
          //   const event = new CustomEvent('RadarContactUpdate', {
          //     detail: { type: 'radarContact', action: 'remove', actor },
          //   });
          //   document.dispatchEvent(event);
          // }
          this.removeContact(actor);
        }
      }
    }

    setTimeout(() => {
      this.checkActorContacts(this.getRadarRange());
    }, 250);
  }

  removeContact(actor) {
    const index = this.radarContacts.indexOf(actor);
    if (index > -1) {
      this.radarContacts.splice(index, 1);
      const event = new CustomEvent('RadarContactUpdate', {
        detail: { type: 'radarContact', action: 'remove', actor },
      });
      document.dispatchEvent(event);
    }
  }

  findRandomTarget() {
    const bodies = actors.filter((actor) => actor !== this);
    const randomIndex = Math.floor(Math.random() * bodies.length);
    this.targetBody = bodies[randomIndex];
  }

  cycleActiveWeaponSelection(state) {
    console.log(state)

    this.hardpoints[this.weaponSelectionIndex].setControlled(false);

    this.weaponSelectionIndex++;

    if (this.weaponSelectionIndex >= this.hardpoints.length) this.weaponSelectionIndex = 0;
    
    this.hardpoints[this.weaponSelectionIndex].setControlled(true);
    console.log("Weapon selected", this.hardpoints[this.weaponSelectionIndex])
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

  handleShipEquipment(deltaTime) {
    
    for (const [ID, selectedEquipment] of Object.entries(this.hardpoints)) {
      if (selectedEquipment.controlled) selectedEquipment.setActive(this.spacePressed);
    }
  }

  customUpdate(deltaTime) {
    if (this.autopilot) {
      this.navigateTowardsTarget();
    }

    this.HandleShipMovement();
    this.handleShipEquipment(deltaTime);
    // drawReticle({ actor: this, color: 'yellow', style: 'dotted', size: this.getRadarRange(), showText: false });

    // this.radarContacts.forEach((contact) => {
    //   drawReticle({ actor: contact, color: 'yellow', style: 'dotted', showText: false });
    // });

    for (const [ID, actor] of Object.entries(this.hardpoints)) {
      actor.setAttachedWorldPosition(this);
    }
  }
}

function addRandomSpread(direction, spreadPercentage) {
  // Adjust the spread calculation here
  let maxSpread = (Math.PI / 180) * (360 * spreadPercentage / 100) / 6; // Example adjustment

  // Generate a random angle within the spread range
  let randomSpread = Math.random() * (maxSpread * 2) - maxSpread;

  // Add the random spread to the direction
  let newDirection = direction + randomSpread;

  // Normalize the new direction
  newDirection = newDirection % (2 * Math.PI);
  if (newDirection < 0) {
      newDirection += 2 * Math.PI;
  }

  return newDirection;
}

console.log('Actors Loaded');
