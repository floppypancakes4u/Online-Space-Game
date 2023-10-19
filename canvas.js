import { sectors } from './sectors.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coordinates');
const minZoom = 0.05;
const maxZoom = 1.0;

let target = null;
let actors = [];
let drawnSectors = new Set();
let gridSize = 50;
let panX = 0;
let panY = 0;

let isPanning = false;
let lastMouseX, lastMouseY;
let zoomFactor = 1.0;

export function setCanvasSize() {
  console.log('zoom: ', zoomFactor);
  canvas.width = window.innerWidth / zoomFactor;
  canvas.height = window.innerHeight / zoomFactor;
  drawGrid();
}

export function drawGrid() {
  const scaledCanvasWidth = canvas.width * zoomFactor;
  const scaledCanvasHeight = canvas.height * zoomFactor;

  ctx.clearRect(0, 0, scaledCanvasWidth, scaledCanvasHeight);

  ctx.save();

  // Apply zoom transformation
  ctx.scale(zoomFactor, zoomFactor);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'lightgrey'; // change grid line color to light grey

  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x - (panX % gridSize), 0);
    ctx.lineTo(x - (panX % gridSize), canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y - (panY % gridSize));
    ctx.lineTo(canvas.width, y - (panY % gridSize));
    ctx.stroke();
  }

  // Draw all actors
  for (let actor of actors) {
    console.log('drawing');
    actor.draw();
  }

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

  // // Draw all actors
  // for (let actor of actors) {
  //   actor.draw(ctx, panX, panY);
  // }

  // Draw sector borders and information
  for (let sector of sectors) {
    //sector.drawBorder();
    drawBorder(sector, sector.isHovered);
    sector.drawSectorInfo(ctx, panX, panY); // Ensure this is after actor.draw()
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
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const worldX = mouseX + panX;
  const worldY = mouseY + panY;

  coordDisplay.textContent = `X: ${worldX}, Y: ${worldY}`;

  if (isPanning) {
    panX += lastMouseX - mouseX;
    panY += lastMouseY - mouseY;
  }

  lastMouseX = mouseX;
  lastMouseY = mouseY;

  //drawGrid();

  // Draw target reticle on mouse over
  target = null;
  for (let actor of actors) {
    target = checkActorAndDescendants(actor, mouseX, mouseY);
    if (target) {
      break;
    }
  }

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

function checkActorAndDescendants(actor, mouseX, mouseY) {
  if (actor.isUnderCursor(mouseX, mouseY)) {
    return actor;
  }

  for (let child of actor.children) {
    let result = checkActorAndDescendants(child, mouseX, mouseY);
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
  if (drawnSectors.has(sector)) {
    ctx.strokeStyle = adjustColor(sector.borderColor, 0.8);
  } else {
    ctx.strokeStyle = isHovered
      ? adjustColor(sector.borderColor, 1.5)
      : sector.borderColor;
    drawnSectors.add(sector);
  }
  ctx.lineWidth = 2;
  ctx.strokeRect(sector.x - panX, sector.y - panY, sector.width, sector.height);
}

export function update() {
  for (let sector of sectors) {
    sector.update();
    // for (const [key, actor] of sector.actors) {
    //   // Using the default iterator (could be `map.entries()` instead)
    //   //console.log(`The value for key ${key} is ${actor}`);
    //   actor.update();
    // }

    sector.recombine();
  }
}

export function canvasRenderLoop() {
  drawGrid();
  update();
  window.requestAnimationFrame(canvasRenderLoop);
}