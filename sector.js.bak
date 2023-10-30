export let sectors = [];

const sectorDefaultSize = 2500;
const MAX_ACTOR_PER_SECTOR = 15;
const MINIMUM_SUBDIVIDE_SIZE = 250;

var SM = null;

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

  static needsExpansion() {
    const buffer = 100; // Distance from the edge to trigger expansion
    for (let actor of actors) {
      for (let sector of sectors) {
        if (
          actor.x - sector.x < buffer ||
          sector.x + sector.width - actor.x < buffer ||
          actor.y - sector.y < buffer ||
          sector.y + sector.height - actor.y < buffer
        ) {
          return true;
        }
      }
    }
    return false;
  }

  static expandUniverse() {
    const newSectors = [];
    for (let sector of sectors) {
      // Check and create new sectors around the existing sector if they don't exist
      if (
        !this.sectorExistsAt(
          sector.x - sector.width,
          sector.y,
          sector.width,
          sector.height
        )
      ) {
        newSectors.push(
          new Sector(
            sector.x - sector.width,
            sector.y,
            sector.width,
            sector.height
          )
        ); // Left
      }
      if (
        !this.sectorExistsAt(
          sector.x + sector.width,
          sector.y,
          sector.width,
          sector.height
        )
      ) {
        newSectors.push(
          new Sector(
            sector.x + sector.width,
            sector.y,
            sector.width,
            sector.height
          )
        ); // Right
      }
      if (
        !this.sectorExistsAt(
          sector.x,
          sector.y - sector.height,
          sector.width,
          sector.height
        )
      ) {
        newSectors.push(
          new Sector(
            sector.x,
            sector.y - sector.height,
            sector.width,
            sector.height
          )
        ); // Top
      }
      if (
        !this.sectorExistsAt(
          sector.x,
          sector.y + sector.height,
          sector.width,
          sector.height
        )
      ) {
        newSectors.push(
          new Sector(
            sector.x,
            sector.y + sector.height,
            sector.width,
            sector.height
          )
        ); // Bottom
      }
    }
    sectors = sectors.concat(newSectors);
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

  shouldRecombine() {
    if (this.children.length === 0) return false; // We don't have any child sectors. Ignore this.
    return this.combinedChildActorCount() < MAX_ACTOR_PER_SECTOR / 2;
  }

  recombine() {
    if (!this.shouldRecombine()) return;

    // Move all actors from child sectors to the parent sector
    for (let child of this.children) {
      for (const [actorName, actor] of child.actors) {
        this.actors.set(actorName, actor);
        actor.currentSector = this; // Update the actor's current sector
      }
      child.actors.clear();

      // Remove child from the sectors array
      const index = sectors.indexOf(child);
      if (index > -1) {
        sectors.splice(index, 1);
      }
    }
    // Clear the child sectors
    this.children = [];
  }

  addActor(actor) {
    // If the sector has children, delegate the addition of the actor to the child sectors
    if (this.children.length > 0) {
      for (let child of this.children) {
        if (child.isWithinBounds(actor)) {
          child.addActor(actor);
          return; // Ensure the actor is added to only one child sector
        }
      }
      return; // If the actor doesn't fit in any child, don't add it to this sector either
    }

    // If the sector doesn't have children, proceed with the current logic
    if (this.actors.size < MAX_ACTOR_PER_SECTOR) {
      this.actors.set(actor.name, actor);
    } else if (
      this.width > MINIMUM_SUBDIVIDE_SIZE &&
      this.height > MINIMUM_SUBDIVIDE_SIZE
    ) {
      // Subdivide if necessary
      if (this.children.length === 0) {
        this.subdivide();
      }
      // After subdividing, try adding the actor to the child sectors
      this.addActor(actor);
    } else {
      this.actors.set(actor.name, actor);
    }
  }

  combinedChildActorCount() {
    return this.children.reduce((total, child) => total + child.actors.size, 0);
  }

  subdivide() {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    this.children.push(new Sector(this.x, this.y, halfWidth, halfHeight));
    this.children.push(
      new Sector(this.x + halfWidth, this.y, halfWidth, halfHeight)
    );
    this.children.push(
      new Sector(this.x, this.y + halfHeight, halfWidth, halfHeight)
    );
    this.children.push(
      new Sector(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight)
    );

    // Move actors to the appropriate child sector
    for (const [actorName, actor] of this.actors) {
      for (let child of this.children) {
        if (child.isWithinBounds(actor)) {
          child.addActor(actor);
          break; // Ensure the actor is added to only one child sector
        }
      }
    }

    // Clear the actors from the current sector
    this.actors.clear();

    // Add child sectors to the sectors array
    for (let child of this.children) {
      sectors.push(child);
    }
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
