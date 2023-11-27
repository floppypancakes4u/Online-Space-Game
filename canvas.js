import { sectors } from './sectors.js';
import {
  Actor,
  Sun,
  Planet,
  Asteroid,
  Spaceship,
  actorTypes,
} from './actors.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coordinates');
const actorDisplay = document.getElementById('actors');
const zoomLevel = document.getElementById('zoom');
const minZoom = 0.1;
const maxZoom = 1.0;

let target = null;
let drawnSectors = new Set();
var totalActors = 0;
let visibleActors = 0;
let culledActors = 0;
let gridSize = 50;
let panX = 0;
let panY = 0;
var hoveredActor = null;

let lastFrameTime = 0; // Variable to store the timestamp of the last frame
var deltaTime = 0;

let isPanning = false;
let lastMouseX, lastMouseY;
let zoomFactor = 1.0;

const pathDataMap = new Map();

export function savePathData(instance, id, scale, pathData, color) {
  if (scale != 0.7) saveScaledPathData(instance, id, scale, pathData, color);
}

function saveScaledPathData(instance, id, scale, path, color) {
  const key = `type-${instance}-id-${id}-scale-${scale.toFixed(2)}`;
  pathDataMap.set(key, { path, color });
}

export function drawActor(ctx, panX, panY, actor) {
  try {
    if (actor instanceof Asteroid) {
      drawAsteroid(ctx, actor, panX, panY);
    } else if (actor instanceof Sun) {
      drawSun(ctx, actor, panX, panY);
    } else if (actor instanceof Spaceship) {
      drawShip(ctx, actor, panX, panY);
    } else if (actor instanceof Projectile) {
      drawBullet(ctx, actor, panX, panY);
      console.log("drawing bullet", actor)
    }

    if (actor.selected) drawReticle({ actor, shape: 'square', color: 'gray' });
  } catch (e) {
    console.error('DrawActor Error', e);
  }
}

export function getCanvasData() {
  s;
  return {
    ctx,
    panX,
    panY,
    zoomFactor,
  };
}

export function setCamera(x, y) {
  const centerX = canvas.width / 2 / zoomFactor;
  const centerY = canvas.height / 2 / zoomFactor;

  panX = x - centerX;
  panY = y - centerY;
}

function drawBullet(
  ctx,
  actor,
  panX,
  panY,
  bulletLength = actor.bulletLength,
  bulletWidth = actor.bulletWidth
) {
  ctx.save();
  ctx.translate(actor.x - panX, actor.y - panY);
  ctx.rotate(actor.rotation);

  const BulletPath = new Path2D();
  // Create the bullet shape as a rectangle
  BulletPath.rect(0, -bulletWidth / 2, bulletLength, bulletWidth);

  ctx.fill(BulletPath);
  ctx.restore();
}

function drawShip(ctx, actor, panX, panY) {
  ctx.save();
  ctx.translate(actor.x - panX, actor.y - panY);
  ctx.rotate(actor.rotation);

  // Draw spaceship shape
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(10, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fillStyle = actor.color;
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
  // for (let child of this.children) {
  //   child.draw(ctx, panX, panY);
  // }
}

function drawSun(ctx, sun, panX, panY) {
  ctx.beginPath();
  ctx.arc(sun.x - panX, sun.y - panY, sun.size, 0, 2 * Math.PI, false);
  ctx.fillStyle = sun.color;
  ctx.fill();
}

function drawAsteroid(ctx, asteroid, panX, panY) {
  const key = `type-${actorTypes.ASTEROID}-id-${
    asteroid.shapeId
  }-scale-${zoomFactor.toFixed(2)}`;
  const pathData = pathDataMap.get(key);

  if (!pathData) {
    console.error(`Path data not found for key: ${key}`);
    console.error('asteroid: ', asteroid);
    return;
  }

  ctx.save();
  ctx.translate(
    (asteroid.x - panX) * zoomFactor,
    (asteroid.y - panY) * zoomFactor
  );
  ctx.fillStyle = pathData.color;
  ctx.fill(new Path2D(pathData.path));
  ctx.restore();
}

export function setCanvasSize() {
  canvas.width = window.innerWidth / zoomFactor;
  canvas.height = window.innerHeight / zoomFactor;
  drawGrid();
}

function drawGrid() {
  ctx.save();

  // Apply zoom transformation
  //ctx.scale(zoomFactor, zoomFactor);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'lightgrey'; // change grid line color to light grey

  // Draw the targeting reticle and dotted line
  // if (target !== null) {
  //   drawReticle(target);

  //   //if (spaceship.targetBody === target) {
  //   if (target.type === 'Spaceship') {
  //     drawFlashingReticle(spaceship, spaceship.targetBody);

  //     ctx.beginPath();
  //     ctx.moveTo(spaceship.x - panX, spaceship.y - panY);
  //     ctx.lineTo(target.x - panX, target.y - panY);
  //     ctx.strokeStyle = 'white';
  //     ctx.setLineDash([5, 5]);
  //     ctx.stroke();
  //   }
  // }

  totalActors = 0;
  visibleActors = 0;
  // Draw sector borders and information
  hoveredActor = null;
  for (let sector of sectors) {
    //sector.drawBorder();
    drawBorder(sector, sector.isHovered);
    sector.drawSectorInfo(ctx, panX, panY, zoomFactor); // TODO: This needs to be moved to this file, but we will get there

    //drawBullet(ctx, { x: 250, y: 250, rotation: 0 }, 0, 0);
    
    for (const [key, actor] of sector.actors) {
      if (actor.isVisible(canvas.width, canvas.height, panX, panY)) {
        drawActor(ctx, panX, panY, actor);

        if (!hoveredActor) {
          hoveredActor = actor.isUnderCursor(lastMouseX, lastMouseY, panX, panY)
            ? actor
            : null;
        }

        visibleActors++;
      }

      totalActors++;
    }

    if (hoveredActor) drawReticle({ actor: hoveredActor });
    //hoveredActor = null;
  }

  drawnSectors.clear();
  ctx.restore();
}

export function initEventListeners() {
  window.addEventListener('resize', setCanvasSize);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('click', function (event) {
    const isLeftClick = event.button === 0; // 0 for left button
    const isRightClick = event.button === 2; // 2 for right button
    const isCtrlPressed = event.ctrlKey;
    const isShiftPressed = event.shiftKey;
    const isAltPressed = event.altKey;

    const worldClickEvent = new CustomEvent('World:Click', {
      detail: {
        actor: hoveredActor,
        leftClick: isLeftClick,
        rightClick: isRightClick,
        ctrl: isCtrlPressed,
        shift: isShiftPressed,
        alt: isAltPressed,
        x: lastMouseX,
        y: lastMouseY,
      },
    });
    document.dispatchEvent(worldClickEvent);
  });

  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();

    const rightClickEvent = new CustomEvent('rightClickCoordinates', {
      detail: { x: lastMouseX, y: lastMouseY, target: hoveredActor },
    });
    document.dispatchEvent(rightClickEvent);

    return false; // To prevent further propagation of the event
  });

  canvas.addEventListener('wheel', (e) => {
    // Prevent the default scroll behavior
    e.preventDefault();

    // Calculate the new zoom factor
    if (e.deltaY < 0) {
      // Zoom in
      zoomFactor = Math.min(zoomFactor + 0.1, maxZoom);
    } else {
      // Zoom out
      zoomFactor = Math.max(zoomFactor - 0.1, minZoom);
    }

    // Update the canvas size and redraw
    setCanvasSize();
  });
}

export function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) / zoomFactor;
  const mouseY = (e.clientY - rect.top) / zoomFactor;

  const worldX = mouseX + panX;
  const worldY = mouseY + panY;

  lastMouseX = worldX;
  lastMouseY = worldY;

  coordDisplay.textContent = `X: ${lastMouseX.toFixed(
    2
  )}, Y: ${lastMouseY.toFixed(2)}`;
}

export function drawReticle(options) {
  const {
    actor,
    color = 'red',
    style = 'solid',
    size = actor.size + 10,
    shape = 'circle',
    showText = true,
  } = options;

  let originalLineWidth = ctx.lineWidth; // Save the original line width

  // Set line style
  switch (style) {
    case 'dotted':
      ctx.setLineDash([2, 3]);
      break;
    case 'dashed':
      ctx.setLineDash([10, 5]);
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
      break;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (shape === 'square') {
    // Length of the corner lines
    const cornerLength = 20;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(actor.x - panX - size, actor.y - panY - size + cornerLength);
    ctx.lineTo(actor.x - panX - size, actor.y - panY - size);
    ctx.lineTo(actor.x - panX - size + cornerLength, actor.y - panY - size);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(actor.x - panX + size, actor.y - panY - size + cornerLength);
    ctx.lineTo(actor.x - panX + size, actor.y - panY - size);
    ctx.lineTo(actor.x - panX + size - cornerLength, actor.y - panY - size);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(actor.x - panX + size, actor.y - panY + size - cornerLength);
    ctx.lineTo(actor.x - panX + size, actor.y - panY + size);
    ctx.lineTo(actor.x - panX + size - cornerLength, actor.y - panY + size);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(actor.x - panX - size, actor.y - panY + size - cornerLength);
    ctx.lineTo(actor.x - panX - size, actor.y - panY + size);
    ctx.lineTo(actor.x - panX - size + cornerLength, actor.y - panY + size);
    ctx.stroke();
  } else {
    // Draw circle reticle
    ctx.beginPath();
    ctx.arc(actor.x - panX, actor.y - panY, size, 0, 2 * Math.PI, false);
    ctx.stroke();
  }

  // Reset line dash
  ctx.setLineDash([]);

  if (showText) {
    ctx.font = '18px Arial';
    ctx.fillStyle = 'white';
    let textX = actor.x - panX + size + 15;
    let textY = actor.y - panY;

    // Adjust text position if it goes beyond the canvas boundaries
    const textWidth = 200; // Approx width of the text
    const textHeight = 60; // Height of the text
    textX = Math.min(textX, canvas.width - textWidth);
    textY = Math.min(Math.max(textY, textHeight), canvas.height - textHeight);

    ctx.fillText(`ID: ${actor.ID}`, textX, textY - 20);
    ctx.fillText(`Type: ${actor.type}`, textX, textY);
    ctx.fillText(`Size: ${actor.size}`, textX, textY + 20); // add 20 pixels for each new line
    ctx.fillText(`Speed: ${actor.getSpeed().toFixed(3)}`, textX, textY + 40); // add 20 pixels for each new line
    ctx.fillText(`X: ${actor.x.toFixed(3)}`, textX, textY + 60); // add 20 pixels for each new line
    ctx.fillText(`Y: ${actor.y.toFixed(3)}`, textX, textY + 80); // add 20 pixels for each new line
    ctx.fillText(`Sector: ${actor.currentSector.name}`, textX, textY + 120); // add 20 pixels for each new line
    if (actor instanceof Planet) {
      ctx.fillText(
        `Orbit Speed: ${actor.orbitSpeed.toFixed(3)}`,
        textX,
        textY + 140
      ); // .toFixed(3) to round to 3 decimal places
    }
  }

  ctx.lineWidth = originalLineWidth; // Restore the original line width
}

// function checkActorAndDescendants(actor) {
//   if (!actor.isUnderCursor) return;

//   if (actor.isUnderCursor(lastMouseX, lastMouseY, panX, panY)) {
//     return actor;
//   }

//   for (let child of actor.children) {
//     let result = checkActorAndDescendants(child);
//     if (result) {
//       return result;
//     }
//   }

//   return null;
// }

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

function adjustColor(color, factor) {
  const [r, g, b] = color.match(/\d+/g).map(Number);
  const adjustedR = Math.max(Math.min(r * factor, 255), 0);
  const adjustedG = Math.max(Math.min(g * factor, 255), 0);
  const adjustedB = Math.max(Math.min(b * factor, 255), 0);
  return `rgb(${adjustedR},${adjustedG},${adjustedB})`;
}

function drawBorder(sector, isHovered) {
  if (sector.shouldDraw()) {
    const scaledX = (sector.x - panX) * zoomFactor + 1;
    const scaledY = (sector.y - panY) * zoomFactor + 1;
    const scaledWidth = sector.width * zoomFactor - 2;
    const scaledHeight = sector.height * zoomFactor - 2;
    const scaledLineWidth = 2 * zoomFactor;

    if (drawnSectors.has(sector)) {
      ctx.strokeStyle = adjustColor(sector.borderColor, 0.8);
    } else {
      ctx.strokeStyle = isHovered
        ? adjustColor(sector.borderColor, 1.5)
        : sector.borderColor;
      drawnSectors.add(sector);
    }
    ctx.lineWidth = scaledLineWidth;

    // Adjusted to draw the rectangle 1 pixel smaller on each side (after scaling)
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
  }
}

const times = [];
const maxSamples = 100;
var runTest = false;

// setInterval(() => {
//   runTest = true;
// }, 250);

function measurePerformance(fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  const time = end - start;
  runTest = false;
  // Add the execution time to our array
  times.push(time);

  // If we have more than maxSamples times, remove the oldest one
  if (times.length > maxSamples) {
    times.shift();
  }

  // Calculate average of times
  const average = times.reduce((a, b) => a + b, 0) / times.length;

  console.log(
    `Execution time: ${time} milliseconds, Average of last ${maxSamples} checks: ${average.toFixed(
      2
    )} milliseconds`
  );
}

export function update() {
  if (runTest) {
    measurePerformance(drawGrid);
  } else {
    drawGrid();
  }

  for (let sector of sectors) {
    sector.update(deltaTime);
  }

  // Update Dev stuff
  actorDisplay.innerHTML = `Visible: ${visibleActors}</br>Total: ${totalActors}`;
  zoomLevel.innerHTML = `Zoom: ${zoomFactor}</br>`;
}

export function canvasRenderLoop() {
  update();
  window.requestAnimationFrame(canvasRenderLoop);
  window.requestAnimationFrame(getDeltaTime);
}

function getDeltaTime(currentTime) {
  // Calculate the time difference in milliseconds between the current frame and the previous frame
  const dt = currentTime - lastFrameTime;

  // Update any animations or game logic using deltaSeconds
  if (dt > 0) {
    deltaTime = dt;
    //console.log('Delta Time: ', deltaTime);
  }

  // Store the current timestamp as the lastFrameTime for the next frame
  lastFrameTime = currentTime;

  // Request the next frame
  requestAnimationFrame(getDeltaTime);
}

coordDisplay.textContent = `X: 0, Y: 0`;

console.log('Canvas Loaded');
