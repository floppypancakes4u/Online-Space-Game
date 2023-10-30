//import { actors, Asteroid } from './actors.js';
import { Asteroid } from './actors.js';

export let sectors = [];

const sectorDefaultSize = 2050;
const MAX_ACTOR_PER_SECTOR = 15;
const MINIMUM_SUBDIVIDE_SIZE = 250;

export class SectorManager {
  static initialize() {
    sectors.push(
      new Sector(
        sectorDefaultSize * -0.5,
        sectorDefaultSize * -0.5,
        sectorDefaultSize,
        sectorDefaultSize
      )
    );
  }

  spawnDebugAsteroids(orbitActor, rangeMultiplier) {
    for (let i = 0; i < 100; i++) {
      let asteroid = new Asteroid(
        orbitActor,
        Math.random() * 30 + 10,
        (Math.random() * 500 + 200) * rangeMultiplier,
        (Math.random() + 0.5) / 1000
      );
      SectorManager.addActor(asteroid);
      //actors.push(asteroid);
    }
  }

  reduceDebugAsteroids() {
    let totalRemoved = 0;
    for (let i = 100; i > 0; i--) {
      for (let sector of sectors) {
        for (let [key, actor] of sector.actors) {
          if (actor instanceof Asteroid) {
            SectorManager.destroyActor(actor);
            totalRemoved++;
          }

          if (totalRemoved >= 100) return;
        }
      }
    }
  }

  static addActor(actor) {
    // If the actor already has a current sector, remove it from that sector
    if (actor.currentSector) {
      actor.currentSector.actors.delete(actor.name);
      actor.currentSector = null;
    }

    for (let sector of sectors) {
      if (sector.isWithinBounds(actor)) {
        sector.addActor(actor);
        actor.currentSector = sector; // Update the actor's current sector
        //console.log(`${actor.name} entered ${sector.name}`);
        break;
      }
    }

    //actors.push(actor);
  }

  static destroyActor(actor) {
    actor.currentSector.destroyActor(actor);
    //actors = actors.filter(element => element !== actor);
  }

  static sectorExistsAt(x, y, width, height) {
    for (let sector of sectors) {
      if (
        sector.x === x &&
        sector.y === y &&
        sector.width === width &&
        sector.height === height
      ) {
        return true;
      }
    }
    return false;
  }

  static getSectorForActor(actor) {
    for (let sector of sectors) {
      if (sector.isWithinBounds(actor)) {
        return sector;
      }
    }
    return null;
  }
}

export class Sector {
  constructor(x, y, width, height) {
    this.name = `Sector [${x}, ${y}]`;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.actors = new Map();
    this.children = [];

    this.borderColor = this.randomColor();
    this.isHovered = false;
  }

  shouldDraw() {
    return this.children.length == 0;
  }

  isWithinBounds(actor) {
    return (
      actor.x >= this.x &&
      actor.x <= this.x + this.width &&
      actor.y >= this.y &&
      actor.y <= this.y + this.height &&
      this.children.length == 0
    );
  }

  addActor(actor) {
    this.actors.set(actor.name, actor);
  }

  destroyActor(actor) {
    this.actors.delete(actor.name);
  }

  getNeighboringActors() {
    // This method should return actors from neighboring sectors.
    // For simplicity, we'll assume a global `sectors` array that contains all top-level sectors.
    let neighbors = [];
    for (let sector of sectors) {
      if (sector !== this && this.isNeighbor(sector)) {
        neighbors = neighbors.concat(sector.actors);
      }
    }
    return neighbors;
  }

  isNeighbor(sector) {
    // Check if the given sector is a neighbor.
    // This is a simplified version and might need more conditions for edge cases.
    return (
      this.x + this.width >= sector.x &&
      this.x <= sector.x + sector.width &&
      this.y + this.height >= sector.y &&
      this.y <= sector.y + sector.height
    );
  }

  randomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }

  brightenColor(color) {
    const [r, g, b] = color.match(/\d+/g).map(Number);
    const factor = 1.5;
    return `rgb(${Math.min(r * factor, 255)},${Math.min(
      g * factor,
      255
    )},${Math.min(b * factor, 255)})`;
  }

  isMouseWithin(mouseX, mouseY, panX, panY) {
    return (
      mouseX >= this.x - panX &&
      mouseX <= this.x + this.width - panX &&
      mouseY >= this.y - panY &&
      mouseY <= this.y + this.height - panY
    );
  }

  darkenColor(color) {
    const [r, g, b] = color.match(/\d+/g).map(Number);
    const factor = 0.7;
    return `rgb(${Math.max(r * factor, 0)},${Math.max(
      g * factor,
      0
    )},${Math.max(b * factor, 0)})`;
  }

  countNeighboringSectors() {
    let count = 0;
    for (let sector of sectors) {
      if (this !== sector && this.isNeighbor(sector)) {
        count++;
      }
    }
    return count;
  }

  drawSectorInfo(ctx, panX, panY) {
    if (this.children.length > 0) return;
    const neighbors = this.countNeighboringSectors();
    const actorCount = this.actors.size;

    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Sector: ${this.name}`, this.x - panX + 5, this.y - panY + 15);
    ctx.fillText(
      `Actors: ${actorCount}`,
      this.x - panX + 5,
      this.y - panY + 30
    );
    ctx.fillText(
      `Neighbors: ${neighbors}`,
      this.x - panX + 5,
      this.y - panY + 45
    ); // Adjusted y position for the second line
  }

  update() {
    for (const [key, actor] of this.actors) {
      actor.update();
    }
  }
}

export const SM = new SectorManager();
