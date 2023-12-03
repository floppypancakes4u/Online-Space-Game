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
    name = "Test Actor",
    description = "Test Actor Description",
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
    this.name = name;
    this.description = description;
    this.x = x;
    this.y = y;
    this.startPos = { x, y };
    this.size = size;
    this.color = color;
    this.rotation = rotation;
    this.type = type;
    this.currentSector = null;
    this.children = [];
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

    
    this.ID = `${this.constructor.name}-${Math.floor(
      Math.random() * 10000
    )}-${Date.now()}`;

    actors[this.ID] = this;

    this.init();
  }

  init() {
    const _ = this;
    document.addEventListener('World:ActorDestroyed', function (event) {
      const { actor } = event.detail;
      _.otherActorDestroyed(actor);
    });
  }

  getName() {
    return this.name;
  }

  applyDamage(projectile) {
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

    delete actors[this.ID];

    // *** TESTING *** //

    this.isActive = false;

    // *** TESTING *** //

    this.markedForDestruction = true;
  }

  otherActorDestroyed(actor) {}

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
      name = "Test Projectile Turret",
      description = "Turrent Description. Might have backstory here",
      x = 0,
      y = 0,
      projectilesPerFiring= 40, // determines how many projectiles fire per fireWeapon being called. Useful for burst fire weapons
      delayBetweenBurstProjectiles = 0.01, // How long between each projectile if projectilesPerFiring is greater than 1. If it is 1, it has no effect.
      // if the above 2 multiplied together are greater than the recoil, then the progress bar will flash indicating it his completely overheated and will not fire again till it stops flashing
      recoil = 250, // Millisecond delay between how long the weapon can fire another shot. Note, this is still applied on top of burst shots
      range = 788,
      accuracy = 25,
      offsetX = 5,
      offsetY = 5,
      existsInWorld = false,
      owningActor = null,
    } = options;
    this.name = name;
    this.description = description;
    this.x = x;
    this.y = y;
    this.recoil = recoil;
    this.projectilesPerFiring = projectilesPerFiring;
    this.delayBetweenBurstProjectiles = delayBetweenBurstProjectiles;
    this.range = range;
    this.accuracy = accuracy;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.existsInWorld = existsInWorld;
    this.owningActor = owningActor;

    //Instance Specific
    this.ID = `${this.constructor.name}-${Math.floor(
      Math.random() * 10000
    )}-${Date.now()}`;
    this.overheating = false; // Is the gun currently overheating
    this.recoilWaitTime = 0; // How long the weapon has been waiting until it can fire again. Counts down from recoilTime

    console.log(options);
  }

  setOverheating(state) {
    this.overheating = state;
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
    this.isFiring = active;
  }

  fireWeapon() {
    let addedDelay = 0;
    
    if (this.projectilesPerFiring == 1) {
      new Projectile({
        ship: this.owningActor,
        x: this.x,
        y: this.y,
        color: 'red',
        rotation: addRandomSpread(this.rotation, this.accuracy),
        range: Math.min(this.range, this.owningActor.getRadarRange()),
        radarContacts: this.owningActor.radarContacts,
      });
      
      addedDelay = this.recoil;
    }

    if (this.projectilesPerFiring > 1) {
      for (let i = 0; i < this.projectilesPerFiring - 1; i++) {
        setTimeout(() => {
          new Projectile({
            ship: this.owningActor,
            x: this.x,
            y: this.y,
            color: 'red',
            rotation: addRandomSpread(this.rotation, this.accuracy),
            range: Math.min(this.range, this.owningActor.getRadarRange()),
            radarContacts: this.owningActor.radarContacts,
          });
        }, i * this.delayBetweenBurstProjectiles * 1000)
      }

      addedDelay = ((this.delayBetweenBurstProjectiles * this.projectilesPerFiring) * 1000) + this.recoil
    }    

    this.recoilWaitTime += addedDelay;     
  }

  getRemainingRecoil() {
    return this.recoilWaitTime / this.recoil;
  }

  reduceCooldown(delta) {
// Reduce our wait time. When it is 0, we can fire again.
    this.recoilWaitTime = Math.floor(Math.max(0, this.recoilWaitTime - delta));
  }

  checkIfFiring(delta) {
    if (this.isFiring) {
      if (this.recoilWaitTime == 0) {
        this.fireWeapon();
      }
    }
  }

  customUpdate(delta) {
    this. reduceCooldown(delta)
    this.checkIfFiring(delta);
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
      if (
        distanceToContact < 35 &&
        contact instanceof Projectile == false &&
        contact instanceof Hardpoint == false
      ) {
        console.log('Contacted: ', contact.constructor.name, distanceToContact);
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

    const turretExamples = [{
      name: "Hailstorm Blitzer",
      description: "Rapid-fire turret that excels in short-range combat, unleashing a barrage of projectiles.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0.02,
      recoil: 50,
      range: 400,
      accuracy: 30,
      offsetX: 6,
      offsetY: 6
    },
    {
      name: "Thunderous Howitzer",
      description: "Delivers powerful, long-range artillery shots. Slow but devastating.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 8000,
      range: 2000,
      accuracy: 10,
      offsetX: 15,
      offsetY: 15
    },
    {
      name: "Twin Cobra",
      description: "Dual-barrel turret that fires alternating shots, providing a consistent stream of damage.",
      projectilesPerFiring: 2,
      delayBetweenBurstProjectiles: 0.1,
      recoil: 300,
      range: 700,
      accuracy: 18,
      offsetX: 10,
      offsetY: 10
    },
    {
      name: "Ion Disruptor",
      description: "Fires ionized energy bolts that can disrupt electronic systems of enemy ships.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 4000,
      range: 1100,
      accuracy: 7,
      offsetX: 8,
      offsetY: 8
    },
    {
      name: "Plasma Flak Cannon",
      description: "A turret that shoots explosive plasma shells, effective against groups of targets.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 2500,
      range: 600,
      accuracy: 35,
      offsetX: 7,
      offsetY: 7
    },{
      name: "Solar Flare Emitter",
      description: "Emits a burst of solar energy, effective against shields.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 3000,
      range: 500,
      accuracy: 50,
      offsetX: 5,
      offsetY: 5
    },
    {
      name: "Quantum Displacer",
      description: "Distorts space-time, creating unpredictable projectile paths.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0.1,
      recoil: 4500,
      range: 900,
      accuracy: 60,
      offsetX: 12,
      offsetY: 12
    },
    {
      name: "Neutron Pulser",
      description: "Fires concentrated neutron beams, highly effective against armor.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 4000,
      range: 1000,
      accuracy: 8,
      offsetX: 9,
      offsetY: 9
    },
    {
      name: "Graviton Launcher",
      description: "Launches projectiles that alter gravitational fields, slowing targets.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 5000,
      range: 700,
      accuracy: 20,
      offsetX: 10,
      offsetY: 10
    },
    {
      name: "Cosmic Shredder",
      description: "Fires a stream of micro-meteors, shredding through enemy defenses.",
      projectilesPerFiring: 10,
      delayBetweenBurstProjectiles: 0.05,
      recoil: 1000,
      range: 400,
      accuracy: 25,
      offsetX: 6,
      offsetY: 6
    },{
      name: "Echo Pulse Turret",
      description: "Fires soundwave pulses that can penetrate through multiple targets.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 3500,
      range: 800,
      accuracy: 12,
      offsetX: 7,
      offsetY: 7
    },
    {
      name: "Void Beam Projector",
      description: "Projects a beam that phases through normal matter, hitting internal components.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 6000,
      range: 1200,
      accuracy: 4,
      offsetX: 8,
      offsetY: 8
    },
    {
      name: "Frostbite Blaster",
      description: "Slows down enemy movement and firing speed with a chilling blast.",
      projectilesPerFiring: 3,
      delayBetweenBurstProjectiles: 0.1,
      recoil: 2000,
      range: 500,
      accuracy: 30,
      offsetX: 6,
      offsetY: 6
    },
    {
      name: "Magnetic Storm Cannon",
      description: "Creates a magnetic field that disrupts enemy electronics and projectiles.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 7000,
      range: 1000,
      accuracy: 15,
      offsetX: 11,
      offsetY: 11
    },
    {
      name: "Inferno Launcher",
      description: "Engulfs targets in flames, causing continuous damage over time.",
      projectilesPerFiring: 5,
      delayBetweenBurstProjectiles: 0.02,
      recoil: 1500,
      range: 300,
      accuracy: 40,
      offsetX: 5,
      offsetY: 5
    },
    {
      name: "Celestial Impactor",
      description: "Fires a dense projectile that causes significant knockback.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 8000,
      range: 1500,
      accuracy: 6,
      offsetX: 14,
      offsetY: 14
    },
    {
      name: "Nebula Mist Sprayer",
      description: "Creates a cloud of obscuring particles, reducing enemy visibility and accuracy.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 2500,
      range: 400,
      accuracy: 50,
      offsetX: 4,
      offsetY: 4
    },
    {
      name: "Photon Scattergun",
      description: "Shoots a wide spread of photon beams, ideal for hitting multiple targets.",
      projectilesPerFiring: 6,
      delayBetweenBurstProjectiles: 0.03,
      recoil: 1200,
      range: 350,
      accuracy: 45,
      offsetX: 6,
      offsetY: 6
    },
    {
      name: "Arc Lightning Rod",
      description: "Generates chain lightning that jumps between nearby targets.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 3000,
      range: 550,
      accuracy: 25,
      offsetX: 7,
      offsetY: 7
    },
    {
      name: "Tempest Vortex Cannon",
      description: "Creates a small vortex at the point of impact, pulling in nearby enemies.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 5000,
      range: 650,
      accuracy: 20,
      offsetX: 9,
      offsetY: 9
    },
    {
      name: "Warp Field Emitter",
      description: "Distorts space around the projectile, making it difficult to predict and dodge.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 4500,
      range: 700,
      accuracy: 30,
      offsetX: 8,
      offsetY: 8
    },
    {
      name: "Stellar Flak Artillery",
      description: "Fires explosive shells that detonate in proximity to targets, showering them with shrapnel.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 6000,
      range: 800,
      accuracy: 35,
      offsetX: 10,
      offsetY: 10
    },
    {
      name: "Gravity Wave Discharger",
      description: "Emits waves that disrupt enemy positioning and formation.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 5500,
      range: 750,
      accuracy: 18,
      offsetX: 9,
      offsetY: 9
    },
    {
      name: "Hypernova Blitzer",
      description: "A high-rate-of-fire turret that overwhelms targets with sheer volume of fire.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0.01,
      recoil: 200,
      range: 450,
      accuracy: 22,
      offsetX: 7,
      offsetY: 7
    },
    {
      name: "Dark Matter Beam",
      description: "Fires a concentrated beam of dark matter, causing severe damage over time.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 4000,
      range: 900,
      accuracy: 5,
      offsetX: 8,
      offsetY: 8
    },
    {
      name: "Electrostatic Pulse Cannon",
      description: "Disables enemy shields and systems temporarily with a burst of electromagnetic energy.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 3500,
      range: 600,
      accuracy: 28,
      offsetX: 6,
      offsetY: 6
    },
    {
      name: "Sonic Wave Emitter",
      description: "Emits powerful sound waves that can disrupt enemy formations and cause disorientation.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 3000,
      range: 500,
      accuracy: 33,
      offsetX: 5,
      offsetY: 5
    },
    {
      name: "Asteroid Hurler",
      description: "Launches large, slow-moving projectiles that cause massive damage on impact.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 10000,
      range: 1000,
      accuracy: 50,
      offsetX: 20,
      offsetY: 20
    },
    {
      name: "Subspace Ripper",
      description: "Creates small tears in subspace, damaging anything in its vicinity.",
      projectilesPerFiring: 1,
      delayBetweenBurstProjectiles: 0,
      recoil: 7000,
      range: 850,
      accuracy: 15,
      offsetX: 12,
      offsetY: 12
    }];

    turretExamples.forEach(turret => {
      this.addHardpoint(turret);
    });

    this.addHardpoint({
      name: "Burst Cannon",
      description: "Fires in short, controlled bursts. Balances firepower and precision.",
      projectilesPerFiring: 3,
      delayBetweenBurstProjectiles: 0.1,
      recoil: 700,
      range: 800,
      accuracy: 15,
      offsetX: 12,
      offsetY: 12
    }
    );

    this.addHardpoint({
      name: "Scatter Shotgun",
      description: "Unleashes a spread of projectiles. Ideal for close-range engagements.",
      projectilesPerFiring: 15,
      delayBetweenBurstProjectiles: 0.0,
      recoil: 500,
      range: 300,
      accuracy: 40,
      offsetX: 5,
      offsetY: 5
    }
  );


    this.checkActorContacts(this.getRadarRange());
  }

  otherActorDestroyed(actor) {
    this.removeContact(actor);
  }

  addHardpoint(data) {
    const newHardpointData = data;
    newHardpointData.existsInWorld = true;
    newHardpointData.owningActor = this;
    this.hardpoints.push(new ProjectileTurret(newHardpointData));
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
    this.hardpoints[this.weaponSelectionIndex].setControlled(false);

    this.weaponSelectionIndex++;

    if (this.weaponSelectionIndex >= this.hardpoints.length)
      this.weaponSelectionIndex = 0;

    this.hardpoints[this.weaponSelectionIndex].setControlled(true);
    console.log('Weapon selected', this.hardpoints[this.weaponSelectionIndex]);
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

      // Ensure velocity doesn't sta below zero
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
      if (selectedEquipment.controlled)
        selectedEquipment.setActive(this.spacePressed);
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
  let maxSpread = ((Math.PI / 180) * ((360 * spreadPercentage) / 100)) / 6; // Example adjustment

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
