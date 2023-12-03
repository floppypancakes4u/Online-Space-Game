import { setCamera } from './canvas.js';
import { Overview } from './overview.js';
import { WeaponOverview } from './weaponOverview.js'

export class PlayerShipController {
  constructor(spaceship, ctx) {
    this.ship = spaceship;
    this.ctx = ctx;
    this.selectedActor = null;
    this.initListeners();
    this.overview = new Overview(this, this.ship);
    this.weaponOverview = new WeaponOverview(this, this.ship);
  }

  initListeners() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ' ': false,
      e: false,
      "1": false,
      "2": false,
      "3": false,
      "4": false,
      "5": false,
      "6": false,
      "7": false,
      "8": false,
      "9": false,
      "0": false,
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
    document.addEventListener('rightClickCoordinates', function (event) {
      const { x, y, target } = event.detail;
      //console.log(`Received right click coordinates: `, event.detail);

      _.ship.setAutopilotTarget(target, x, y);
      // Perform any action with these coordinates
    });

    document.addEventListener('RadarContactUpdate', function (event) {
      const { type, action, actor } = event.detail;
      //console.log(`Received Contact Details: `, event.detail);

      if (type == 'radarContact') {
        if (action == 'add') {
          _.overview.addContact(actor);
        } else if (action == 'remove') {
          _.overview.removeContact(actor);
        }
      }
      // Perform any action with these coordinates
    });

    document.addEventListener('Overview:ContactSelected', function (event) {
      const { actor, leftClick, rightClick, ctrl, shift, alt } = event.detail;
      console.log(`Overview:ContactSelected `, {
        actor,
        leftClick,
        rightClick,
        ctrl,
        shift,
        alt,
      });

      _.selectActor(actor);
    });

    document.addEventListener('World:Click', function (event) {
      const { actor, leftClick, rightClick, ctrl, shift, alt, x, y } =
        event.detail;

      // console.log('World:Click', {
      //   actor,
      //   leftClick,
      //   rightClick,
      //   ctrl,
      //   shift,
      //   alt,
      //   x,
      //   y,
      // });

      _.selectActor(actor);
    });
  }

  selectActor(actor) {
    if (this.selectedActor != null) this.selectedActor.setSelected(false);
    if (actor === null) {
      this.overview.clearLastSelected();
      return;
    }

    this.selectedActor = actor;
    this.selectedActor.setSelected(true);
    this.overview.selectActor(actor);
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
    this.ship.space(this.keys[" "])
    
    if (doOnceKey("e", this.keys.e)) this.ship.cycleActiveWeaponSelection(true)

    if (this.keys.w || this.keys.s || this.keys.a || this.keys.d)
      this.ship.disableAutopilot();

    this.ship.update(); // Continue to update the ship's position and state
    this.centerCameraOnShip();
  }
}

var pressedKeys = {}

// This will set active keys and return true only the first time the key is called
// Useful for key button presses until a more elegant solution is developed
// Passes the result one time to the func
function doOnceKey(key, state, func) {
  if (pressedKeys[key] == undefined) pressedKeys[key] = false;

  if (!pressedKeys[key] && state) {
    pressedKeys[key] = true;
    return true
  }

  if (pressedKeys[key] && !state) {
    pressedKeys[key] = false;
    return false
  }
}