export class Overview {
  constructor(actor) {
    this.owningActor = actor;

    this.actors = {}; // Object to store actors with their IDs
    this.selectedActorId = null; // Keep track of the selected actor
    this.initContainer();
  }

  initContainer() {
    this.panel = jsPanel.create({
      theme: 'dark',
      headerLogo: '<i class="fad fa-home-heart ml-2"></i>',
      headerTitle: "I'm a jsPanel",
      headerToolbar: `<span class="text-sm">Overview</span>`,
      footerToolbar:
        '<span class="flex flex-grow">You can have a footer toolbar too</span>' +
        '<i class="fal fa-clock mr-2"></i><span class="clock">loading ...</span>',
      panelSize: {
        width: () => {
          return Math.min(800, window.innerWidth * 0.9);
        },
        height: () => {
          return Math.min(500, window.innerHeight * 0.6);
        },
      },
      animateIn: 'jsPanelFadeIn',      
      content: `<div class="overviewArea"><table id="overviewTable"><thead><tr><th>Distance</th><th>Name</th><th>Action</th></tr></thead><tbody></tbody></table></div>`,
      onwindowresize: true,
      callback: function (panel) {
        function clock() {
          let time = new Date(),
            hours = time.getHours(),
            minutes = time.getMinutes(),
            seconds = time.getSeconds();
          panel.footer.querySelectorAll('.clock')[0].innerHTML = `${harold(
            hours
          )}:${harold(minutes)}:${harold(seconds)}`;
          function harold(standIn) {
            if (standIn < 10) {
              standIn = '0' + standIn;
            }
            return standIn;
          }
        }
        setInterval(clock, 1000);
      },
    });
  }

  addContact(actor) {
    this.addActorRow(actor);
  }

  removeContact(actor) {
    this.removeActorRow(actor.ID);
  }

  addActorRow(actor) {
    this.actors[actor.ID] = new ActorRow(this.owningActor, actor, this);
  }

  getActorRowById(id) {
    return this.actors[id];
  }

  removeActorRow(id) {
    if (this.actors[id]) {
      this.actors[id].remove();
      delete this.actors[id];
    }
  }

  sortTable(columnIndex) {
    // Sorting logic goes here (adapted from your existing sortTable function)
  }

  // Other methods for handling the Overview...
}

class ActorRow {
  constructor(owningActor, actor, overview) {
    this.owningActor = owningActor;
    this.actor = actor;
    // this.overview = overview;
    // this.row = this.overview.table.insertRow();
    // // ... rest of ActorRow initialization
    this.createRow();
  }

  createRow() {
    this.table = document.getElementById("overviewTable").getElementsByTagName('tbody')[0];
    this.row = this.table.insertRow(); //document.createElement("tr");
    this.distanceCell = this.row.insertCell(0);
    this.nameCell = this.row.insertCell(1);
    this.actionCell = this.row.insertCell(2);

    this.nameCell.innerHTML = "Actor " + this.actor.ID;
    console.log("actor: ", this.owningActor)
    this.distanceCell.innerHTML = this.owningActor.distanceTo(this.actor);
    this.actionCell.innerHTML = '<button onclick="removeRow(this, event)">Remove</button>';

    this.row.id = this.actor.ID;

    if (this.actor.hostile && !this.actor.targeted) {
      this.setHostile();
    }

    if (this.actor.targeted && !this.actor.hostile) {
      this.setFriendly();
    }

    this.row.onclick = (event) => {
      event.stopPropagation();
      event.preventDefault();

      const isLeftClick = event.button === 0; // 0 for left button
      const isRightClick = event.button === 2; // 2 for right button
      const isCtrlPressed = event.ctrlKey;
      const isShiftPressed = event.shiftKey;
      const isAltPressed = event.altKey;

      this.select({leftClick: isLeftClick, rightClick: isRightClick, ctrl: isCtrlPressed, shift: isShiftPressed, alt: isAltPressed});      
    };

    setInterval(() => {
      if (actors[this.actor.ID]) {
        this.updateDistance();
      }
    }, 1000);
  }

  setHostile() {
    this.row.classList.add("actor-hostile");
  }

  setFriendly() {
    this.row.classList.add("actor-targeted");
  }

  select({leftClick, rightClick, ctrl, shift, alt}) {
    console.log(`Last Row ID: ${this.selectedActorId}`)

    if (this.selectedActorId !== null) {
      const previousRow = document.getElementById(this.selectedActorId);
      if (previousRow) {
        previousRow.classList.remove("actor-selected");
      }
    }
    this.selectedActorId = this.actor.ID;

    console.log('Actor selected:', actors[this.actor.ID], this.actor.ID);
    console.log({leftClick, rightClick, ctrl, shift, alt})
    this.row.classList.add("actor-selected");
  }

  updateDistance() {
    this.distanceCell.innerHTML = this.actor.getDistance().toFixed(2);
  }

  remove() {
    // If the removed row was selected, clear the selection
    if (this.selectedActorId === this.actor.ID) {
      this.selectedActorId = null;
    }
    
    this.row.remove();
    delete actors[this.actor.ID];
  }
}

// ... Actor class remains the same
