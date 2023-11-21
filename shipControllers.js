import { setCamera } from './canvas.js';

export class PlayerShipController {
  constructor(spaceship, ctx) {
    this.ship = spaceship;
    this.ctx = ctx;
    this.initListeners();
  }

  initListeners() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
    };

    window.addEventListener('keydown', (event) => {
      if (event.key in this.keys) {
        this.keys[event.key] = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key in this.keys) {
        this.keys[event.key] = false;
      }
    });

    const _ = this;
    document.addEventListener('rightClickCoordinates', function(event) {
      const { x, y, target } = event.detail;
      console.log(`Received right click coordinates: `, event.detail);
  
      _.ship.setAutopilotTarget(target, x, y)
      // Perform any action with these coordinates
  });
  }

  centerCameraOnShip() {
    setCamera(this.ship.x, this.ship.y);
  }

  update() {
    // Pass the key's state (true if pressed, false if not) to the ship's methods
    this.ship.thrustForward(this.keys.w);
    this.ship.stopThrust(this.keys.s);
    this.ship.rotateLeft(this.keys.a);
    this.ship.rotateRight(this.keys.d);

    if (this.keys.w || this.keys.s || this.keys.a || this.keys.d) this.ship.disableAutopilot()

    this.ship.update(); // Continue to update the ship's position and state
    this.centerCameraOnShip();
  }
}
