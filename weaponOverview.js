export class WeaponOverview {
  constructor(controller, actor) {
    this.controller = controller;
    this.owningActor = actor;
    this.selectedHardpointIndex = 0;
    this.initContainer();
  }

  initContainer() {
    this.panel = jsPanel.create({
      theme: 'dark',
      headerLogo: '<i class="fad fa-home-heart ml-2"></i>',
      headerTitle: "Weapons",
      headerToolbar: `<span class="text-sm">Weapons</span>`,
      position: {
        my: 'right-top',
        at: 'right-top',
      },
      // footerToolbar:
      //   '<span class="flex flex-grow">You can have a footer toolbar too</span>' +
      //   '<i class="fal fa-clock mr-2"></i><span class="clock">loading ...</span>',
      panelSize: {
        width: () => {
          return Math.min(300, window.innerWidth * 0.9);
        },
        height: () => {
          return Math.min(500, window.innerHeight * 0.6);
        },
      },
      animateIn: 'jsPanelFadeIn',
      content: `<div class="weaponOverview"></div>`,
      onwindowresize: true,
      // callback: function (panel) {
      //   function clock() {
      //     let time = new Date(),
      //       hours = time.getHours(),
      //       minutes = time.getMinutes(),
      //       seconds = time.getSeconds();
      //     panel.footer.querySelectorAll('.clock')[0].innerHTML = `${harold(
      //       hours
      //     )}:${harold(minutes)}:${harold(seconds)}`;
      //     function harold(standIn) {
      //       if (standIn < 10) {
      //         standIn = '0' + standIn;
      //       }
      //       return standIn;
      //     }
      //   }
      //   setInterval(clock, 1000);
      // },
    });

    // The UI starts after the actor is created, so make sure to grab any existing
    // radar contacts that the actor has before we started listening for broadcasts
    this.owningActor.radarContacts.forEach((contact) => {
      this.addContact(contact);
    });
  }

  addWeaponRow(actor) {
    this.addActorRow(actor);
  }


  clearRows() {
    
  }
}

class EquipmentRow {
  constructor({overviewDiv = null, equipmentActor = null} = {}) {
    this.overviewDiv = overviewDiv;
    this.equipmentActor = equipmentActor;
    this.init();
  }

  init() {
    this.table = document
      .getElementById('overviewTable')
      .getElementsByTagName('tbody')[0];
    this.row = this.table.insertRow(); //document.createElement("tr");
    this.distanceCell = this.row.insertCell(0);
    this.nameCell = this.row.insertCell(1);
    this.actionCell = this.row.insertCell(2);

    this.nameCell.innerHTML = 'Actor ' + this.targetActor.ID;
    this.distanceCell.innerHTML = this.owningActor.distanceTo(this.targetActor);
    this.actionCell.innerHTML =
      '<button onclick="removeRow(this, event)">Remove</button>';

    this.row.id = this.targetActor.ID;

    if (this.targetActor.hostile && !this.targetActor.targeted) {
      this.setHostile();
    }

    if (this.targetActor.targeted && !this.targetActor.hostile) {
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

      this.select({
        leftClick: isLeftClick,
        rightClick: isRightClick,
        ctrl: isCtrlPressed,
        shift: isShiftPressed,
        alt: isAltPressed,
      });
    };

    setInterval(() => {
      if (actors[this.targetActor.ID]) {
        this.update();
      }
    }, 1000);

    /// OLD ABOVE
    /// NEW BELOG

  }

  createRow() {
    var newDiv = document.createElement('div');

    // Step 3: Optional - Add content, attributes, styles, etc.
    newDiv.innerHTML = this.equipmentActor.getName(); // Adding text content
    newDiv.className = 'equipment-row'; // Setting a class name

    newDiv.id = `${this.equipmentActor.id}-equipment-div-container`
  }

  update() {

  }
}

// ... Actor class remains the same
