export class PlayerShipController {
  constructor(spaceship) {
    this.ship = spaceship;

    this.initKeyListeners();
  }

  initKeyListeners() {
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
  }

  update() {
    // Pass the key's state (true if pressed, false if not) to the ship's methods
    this.ship.thrustForward(this.keys.w);
    this.ship.stopThrust(this.keys.s);
    this.ship.rotateLeft(this.keys.a);
    this.ship.rotateRight(this.keys.d);

    this.ship.update(); // Continue to update the ship's position and state
  }
}
