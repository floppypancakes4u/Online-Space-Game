// main.js
import {
  setCanvasSize,
  canvasRenderLoop,
  initEventListeners,
  getCanvasData,
} from './canvas.js';
import { SM, SectorManager } from './sectors.js';
import {
  initActors,
  Actor,
  Sun,
  Planet,
  Asteroid,
  Spaceship,
} from './actors.js';
import { PlayerShipController } from './shipControllers.js';

let lastFrameTime = 0; // Variable to store the timestamp of the last frame
const ASTEROID_COUNT = 100;
(function () {
  // Main canvas setup
  initActors();
  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);

  initEventListeners();

  // Initialize sectors
  SectorManager.initialize();

  // Create actors and initialize game loop
  // Generate Solar Bodies
  let sun = new Sun(0, 0, 50, 'yellow');
  SectorManager.addActor(sun);

  // Draw Planets
  // let planetColors = ['blue', 'green', 'red', 'purple', 'white'];
  // for (let i = 0; i < 5; i++) {
  //   let planet = new Planet(
  //     sun,
  //     10,
  //     planetColors[i],
  //     100 * (i + 1),
  //     0.0001 * (i + 1)
  //   );
  //   SectorManager.addActor(planet);
  //   sun.children.push(planet);

  //   // Add random moons to each planet
  //   let numMoons = Math.floor(Math.random() * 4); // Up to 3 moons
  //   for (let j = 0; j < numMoons; j++) {
  //     let moon = new Planet(planet, 5, 'gray', 30 * (j + 1), 0.0002 * (j + 1));
  //     SectorManager.addActor(moon);
  //     planet.children.push(moon);
  //   }
  // }

  // Draw Asteroids
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    let asteroid = new Asteroid(
      sun,
      Math.random() * 30 + 10,
      Math.random() * 500 + 200,
      (Math.random() + 0.5) / 1000
    );
    SectorManager.addActor(asteroid);
  }

  // Remove the existing spaceship and create a new Spaceship instance
  let spaceship = new Spaceship(100, 0, 15, 'cyan');
  SectorManager.addActor(spaceship);

  const playerController = new PlayerShipController(spaceship);
  //actors.push(spaceship);

  // Generate random target for the spaceship
  //spaceship.findRandomTarget();
  //spaceship.isMoving = true;

  // DEV Controls
  const slider = document.getElementById('asteroidSlider');
  const sliderValueDisplay = document.getElementById('sliderValue');

  slider.addEventListener('input', () => {
    sliderValueDisplay.textContent = slider.value;
  });

  document.getElementById('spawnAsteroids').addEventListener('click', () => {
    const sliderValue = parseInt(slider.value, 10);
    SM.spawnDebugAsteroids(sun, sliderValue);
  });

  document.getElementById('reduceAsteroids').addEventListener('click', () => {
    SM.reduceDebugAsteroids();
  });

  function gameLoop() {
    playerController.update();
    window.requestAnimationFrame(gameLoop);
  }

  window.requestAnimationFrame(gameLoop);

  // Start the game loop
  window.requestAnimationFrame(canvasRenderLoop);
})();

function getDeltaTime(currentTime) {
  
  // Calculate the time difference in milliseconds between the current frame and the previous frame
  const deltaTime = currentTime - lastFrameTime;

  // Convert deltaTime from milliseconds to seconds (divide by 1000)
  const deltaSeconds = deltaTime / 1000;

  // Update any animations or game logic using deltaSeconds

  // Store the current timestamp as the lastFrameTime for the next frame
  lastFrameTime = currentTime;

  // Request the next frame
  requestAnimationFrame(getDeltaTime);
}

// Start the animation loop by requesting the first frame
requestAnimationFrame(getDeltaTime);

console.log('Main Loaded');
