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

let isPanning = false;
let lastMouseX, lastMouseY;
let zoomFactor = 1.0;

const pathDataMap = new Map();
console.log('canvas');

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
    }
  } catch (e) {
    console.error('DrawActor Error', e);
  }
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

export function drawGrid() {
  ctx.save();

  // Apply zoom transformation
  //ctx.scale(zoomFactor, zoomFactor);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'lightgrey'; // change grid line color to light grey

  // const dynamicGridSize = gridSize * Math.ceil(1 / zoomFactor);

  // ctx.beginPath();
  // for (
  //   let x = -panX % dynamicGridSize;
  //   x <= canvas.width / zoomFactor;
  //   x += dynamicGridSize
  // ) {
  //   const adjustedX = x + dynamicGridSize / 2 - 1;
  //   ctx.moveTo(adjustedX, 0);
  //   ctx.lineTo(adjustedX, canvas.height / zoomFactor);
  // }

  // for (
  //   let y = -panY % dynamicGridSize;
  //   y <= canvas.height / zoomFactor;
  //   y += dynamicGridSize
  // ) {
  //   const adjustedY = y + dynamicGridSize / 2 - 1;
  //   ctx.moveTo(0, adjustedY);
  //   ctx.lineTo(canvas.width / zoomFactor, adjustedY);
  // }
  // ctx.stroke();

  // Draw the targeting reticle and dotted line
  if (target !== null) {
    drawReticle(target);

    //if (spaceship.targetBody === target) {
    if (target.type === 'Spaceship') {
      drawFlashingReticle(spaceship, spaceship.targetBody);

      ctx.beginPath();
      ctx.moveTo(spaceship.x - panX, spaceship.y - panY);
      ctx.lineTo(target.x - panX, target.y - panY);
      ctx.strokeStyle = 'white';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
    }
  }

  totalActors = 0;
  visibleActors = 0;
  // Draw sector borders and information
  for (let sector of sectors) {
    //sector.drawBorder();
    drawBorder(sector, sector.isHovered);
    sector.drawSectorInfo(ctx, panX, panY, zoomFactor); // TODO: This needs to be moved to this file, but we will get there

    for (const [key, actor] of sector.actors) {
      if (actor.isVisible(canvas.width, canvas.height, panX, panY)) {
        //actor.draw(ctx, panX, panY);
        drawActor(ctx, panX, panY, actor);  
    
        if (!hoveredActor) {
          hoveredActor = actor.isUnderCursor(lastMouseX, lastMouseY, panX, panY) ? actor : null;    
        }

        visibleActors++;
      }

      totalActors++;
    }

    if (hoveredActor) drawReticle(hoveredActor);
    hoveredActor = null;
  }

  drawnSectors.clear();
  ctx.restore();
}

export function initEventListeners() {
  window.addEventListener('resize', setCanvasSize);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
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

  // Calculate the world coordinates considering panning
  const worldX = mouseX + panX;
  const worldY = mouseY + panY;

  coordDisplay.textContent = `X: ${worldX.toFixed(2)}, Y: ${worldY.toFixed(2)}`;

  if (isPanning) {
    const panSpeed = 1.5; // You can adjust this value to your preference
    panX += panSpeed * (lastMouseX - mouseX);
    panY += panSpeed * (lastMouseY - mouseY);
  }

  lastMouseX = mouseX;
  lastMouseY = mouseY;

  //drawGrid();

  for (let sector of sectors) {
    sector.isHovered = sector.isMouseWithin(mouseX, mouseY, panX, panY);
  }
}

export function mouseDown(e) {
  if (e.button === 2) {
    isPanning = true;
  }
}

export function mouseUp(e) {
  if (e.button === 2) {
    isPanning = false;
  }
}

function drawReticle(actor) {
  let originalLineWidth = ctx.lineWidth; // Save the original line width

  ctx.beginPath();
  ctx.arc(
    actor.x - panX,
    actor.y - panY,
    actor.size + 10,
    0,
    2 * Math.PI,
    false
  );
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '18px Arial';
  ctx.fillStyle = 'white';
  let textX = actor.x - panX + actor.size + 15;
  let textY = actor.y - panY;

  // Adjust text position if it goes beyond the canvas boundaries
  const textWidth = 200; // Approx width of the text
  const textHeight = 60; // Height of the text
  textX = Math.min(textX, canvas.width - textWidth);
  textY = Math.min(Math.max(textY, textHeight), canvas.height - textHeight);

  ctx.fillText(`Type: ${actor.type}`, textX, textY);
  ctx.fillText(`Size: ${actor.size}`, textX, textY + 20); // add 20 pixels for each new line
  ctx.fillText(`X: ${actor.x.toFixed(3)}`, textX, textY + 40); // add 20 pixels for each new line
  ctx.fillText(`Y: ${actor.y.toFixed(3)}`, textX, textY + 60); // add 20 pixels for each new line
  ctx.fillText(`Sector: ${actor.currentSector.name}`, textX, textY + 100); // add 20 pixels for each new line
  if (actor instanceof Planet) {
    ctx.fillText(
      `Orbit Speed: ${actor.orbitSpeed.toFixed(3)}`,
      textX,
      textY + 80
    ); // .toFixed(3) to round to 3 decimal places
  }

  ctx.lineWidth = originalLineWidth; // Restore the original line width
}

function checkActorAndDescendants(actor) {
  if (!actor.isUnderCursor) return;

  if (actor.isUnderCursor(lastMouseX, lastMouseY, panX, panY)) {
    return actor;
  }

  for (let child of actor.children) {
    let result = checkActorAndDescendants(child);
    if (result) {
      return result;
    }
  }

  return null;
}

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
    sector.update();    
  }

  // Update Dev stuff
  actorDisplay.innerHTML = `Visible: ${visibleActors}</br>Total: ${totalActors}`;
  zoomLevel.innerHTML = `Zoom: ${zoomFactor}</br>`;
}

export function canvasRenderLoop() {
  update();
  window.requestAnimationFrame(canvasRenderLoop);
}

coordDisplay.textContent = `X: 0, Y: 0`;

console.log('Canvas Loaded');
