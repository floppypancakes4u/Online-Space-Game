// main.js
import {
  setCanvasSize,
  canvasRenderLoop,
  initEventListeners,
} from './canvas.js';
import { SectorManager } from './sectors.js';
import { Actor, Planet, Asteroid, Spaceship, actors } from './actors.js';

const ASTEROID_COUNT = 100;

export function initGame() {
  // Main canvas setup
  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);
  initEventListeners();

  // Initialize sectors
  SectorManager.initialize();

  // Create actors and initialize game loop
  // Generate Solar Bodies
  let sun = new Actor(0, 0, 50, 'yellow');
  SectorManager.addActor(sun);
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
    SectorManager.addActor(planet);
    sun.children.push(planet);

    // Add random moons to each planet
    let numMoons = Math.floor(Math.random() * 4); // Up to 3 moons
    for (let j = 0; j < numMoons; j++) {
      let moon = new Planet(planet, 5, 'gray', 30 * (j + 1), 0.0002 * (j + 1));
      SectorManager.addActor(moon);
      planet.children.push(moon);
    }
  }

  // Draw Asteroids
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    let asteroid = new Asteroid(
      sun,
      Math.random() * 30 + 10,
      Math.random() * 500 + 200,
      (Math.random() + 0.5) / 1000
    );
    SectorManager.addActor(asteroid);
    actors.push(asteroid);
  }

  // Remove the existing spaceship and create a new Spaceship instance
  let spaceship = new Spaceship(100, 0, 15, 'cyan');
  SectorManager.addActor(spaceship);
  actors.push(spaceship);

  // Generate random target for the spaceship
  spaceship.findRandomTarget();
  spaceship.isMoving = true;

  // Start the game loop
  window.requestAnimationFrame(canvasRenderLoop);
}

initGame();
