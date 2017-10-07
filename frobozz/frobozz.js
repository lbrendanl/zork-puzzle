/* @preserve (c) Tableau 2017. Checking out the source code?  We respect that.  It's not required, but we definitely won't punish you for solving the puzzle in unique ways!
 */
var TC = {

    init: function() {
        TC.terminal.init('terminal-history', 'terminal-input');
        TC.gameconfig = TC.game.assignIds(TC.gameconfig); // Used later for numbered input choices
        TC.game.init(TC.gameconfig);
        TC.player.init();
        TC.keyboard.init();
    },

    terminal: {
        init: function(historyDivId, inputId) {
            this.history = document.getElementById(historyDivId);
            this.input = document.getElementById(inputId);
        },

        write: function(text) {
            if (typeof text !== 'undefined') {
                this.history.innerHTML += text;
            }

            this.history.innerHTML += '<br />';
        },

        getInput: function() {
            return this.input.value;
        },

        showInput: function() {
            this.input.parentNode.style.display = 'block';
            this.input.focus();
        },

        hideInput: function() {
            this.input.parentNode.style.display = 'none';
        },

        echoInput: function(input) {
            this.write();
            this.write(' > ' + input);
            this.write();
        },

        parseAndTokenizeInput: function(input) {
            var tokens = input.trim().toLowerCase().split(' ');
            // Only accept one id (or word) as input
            if (tokens.length === 0 || tokens.length > 1) {
                TC.terminal.write(TC.gameconfig.messages.inputNotUnderstood);
            }

            return tokens[0];
        },

        clearInput: function() {
            this.input.value = '';
        },

        clearHistory: function() {
            this.history.innerHTML = '';
        },

        scrollIntoView: function() {
            this.input.scrollIntoView();
        }
    },

    game: {
        init: function(config) {
            this.config = config;
            this.setCurrentRoom(this.config.startRoom);
        },

        assignIds: function(config) {
            var rooms = config.rooms;
            for (var room in rooms) {
                // Last room doesn't have room events
                if (typeof rooms[room].roomEvents !== 'undefined') {
                    for (var e = 0; e < rooms[room].roomEvents.length; e++) {
                        rooms[room].roomEvents[e].id = e + 1;
                    }
                }
                // Some rooms don't have alternates
                if (typeof rooms[room].alternateRoomEvents !== 'undefined') {
                    for (var a = 0; a < rooms[room].alternateRoomEvents.length; a++) {
                        rooms[room].alternateRoomEvents[a].id = a + 1;
                    }
                }
            }
            return config;
        },

        getRoomByName: function(roomName) {
            return this.config.rooms[roomName];
        },

        setCurrentRoom: function(roomName) {
            this.currentRoom = this.getRoomByName(roomName);
            this.loadRoom(this.currentRoom);
        },

        loadRoom: function(room) {
            TC.terminal.write();
            TC.events.look.action();
        },

        getEventFromID: function(id) {
            var roomEvents = TC.game.currentRoom.roomEvents;

            // Global inventory option
            if (id === "0") {
                return TC.events.inventory;
            }

            for (var i = 0; i < roomEvents.length; i++) {
                if (id == roomEvents[i].id) {
                    return roomEvents[i];
                }
            }

            return;
        },

        getEventFromInventoryUsage: function(id) {
            var roomEvents = TC.game.currentRoom.roomEvents;

            if (TC.player.inventory.indexOf(id) !== -1) {
                for (var i = 0; i < roomEvents.length; i++) {
                    if (roomEvents[i].type == id) {
                        return roomEvents[i];
                    }
                }
                return TC.events.cannotUseItem;
            }
            return;
        },

        performAction: function(roomEvent) {
            TC.events[roomEvent.type].action(roomEvent.param);
        },

        switchToAlternateDescAndEvents: function(room) {
            room.description = room.alternateDescription;
            room.roomEvents = room.alternateRoomEvents;
        },

        displayChoices: function(room) {
            if (room.roomEvents.length > 0) {
                TC.terminal.write();                
                TC.terminal.write(TC.gameconfig.messages.makeChoice);
                TC.terminal.write();
                TC.terminal.write('0) View inventory');

                for (var i = 0; i < room.roomEvents.length; i++) {
                    if (!room.roomEvents[i].hidden) {
                        TC.terminal.write(room.roomEvents[i].id + ') ' + room.roomEvents[i].choice);
                    }
                }
            }
        }
    },

    events: {
        'inventory': {
            type: 'inventory',
            action: function(param) {
                var inv = TC.player.getInventory();
                if (inv.length < 1) {
                    TC.terminal.write(TC.gameconfig.messages.emptyInventory);
                    return;
                }
                TC.terminal.write(TC.gameconfig.messages.inventoryContents);
                TC.terminal.write(inv.join(', '));
                TC.terminal.write();
                TC.terminal.write(TC.gameconfig.messages.inventoryInstructions);
            }
        },
        'look': {
            type: 'look',
            action: function(param) {
                var room = TC.game.currentRoom;
                TC.terminal.write(room.description);
                TC.game.displayChoices(room);
            }
        },
        'examine': {
            type: 'examine',
            action: function(param) {
                if (TC.player.possibleInventory.indexOf(param) !== -1) {
                    TC.events.take.action(param);
                    return;
                }
            }
        },

        'enter': {
            type: 'enter',
            action: function(param) {
                if (param === 'death') {
                    TC.events.death.action(param);
                    return;
                } else if (param === '') {
                    return;
                }

                TC.terminal.hideInput();

                window.setTimeout(function() {
                    TC.terminal.clearHistory();
                    TC.game.setCurrentRoom(param);

                    var isLastRoom = (typeof TC.game.currentRoom.roomEvents === 'undefined');
                    if (!isLastRoom) {
                        TC.terminal.showInput();
                    }
                }, 2000);
            }
        },
        'exit': {
            type: 'exit',
            action: function(param) {
                TC.events.enter.action(param);
                // Requires a separate entry for mapping to previous room. Consider adding a room history.
            }
        },
        'take': {
            type: 'take',
            action: function(param) {
                if (typeof param === 'undefined' ||
                    param === '' ||
                    TC.player.possibleInventory.indexOf(param) === -1) {

                    TC.terminal.write(TC.gameconfig.messages.nothingToTake);
                    return;
                }

                TC.player.addToInventory(param);
                TC.game.switchToAlternateDescAndEvents(TC.game.currentRoom);
                TC.terminal.write(TC.gameconfig.messages.itemAddedToInventory);
                TC.terminal.write('-- ' + param);
                TC.terminal.write();
                TC.events.look.action();
            }
        },
        'cannotUseItem': {
            type: 'cannotUseItem',
            action: function(param) {
                TC.terminal.write(TC.gameconfig.messages.cannotUseItemHere);
            }
        },
        'attack': {
            type: 'attack',
            action: function(param) {
                if (param === 'death') {
                    TC.events.death.action(param);
                    return;
                }
                TC.events.enter.action(param);
            }
        },
        'bribe': {
            type: 'bribe',
            action: function(param) {
                TC.events.death.action(param);
            }
        },
        'talk': {
            type: 'talk',
            action: function(param) {
                TC.game.switchToAlternateDescAndEvents(TC.game.currentRoom);
                TC.events.enter.action(param);
            }
        },
        'death': {
            type: 'death',
            action: function(param) {
                TC.terminal.write();
                TC.terminal.write(TC.gameconfig.messages.gameOver);
                TC.terminal.hideInput();
            }
        },
        'run': {
            type: 'run',
            action: function(param) {
                if (param === 'death') {
                    TC.events.death.action(param);
                    return;
                }

                TC.events.exit.action(param);
            }
        },
        'key': {
            type: 'key',
            action: function(param) {
                if (TC.player.inventory.indexOf('key') !== -1) {
                    TC.terminal.write(TC.gameconfig.messages.unlocked);
                    TC.game.switchToAlternateDescAndEvents(TC.game.currentRoom);
                    TC.player.removeFromInventoryOnUse('key');
                    TC.events.enter.action(param);
                    return;
                }
                TC.terminal.write(TC.gameconfig.messages.noKey);
            }
        },
        'turkey': {
            type: 'turkey',
            action: function(param) {
                if (TC.player.inventory.indexOf('turkey') !== -1) {
                    TC.game.switchToAlternateDescAndEvents(TC.game.currentRoom);
                    TC.events.enter.action(param);
                    TC.player.removeFromInventoryOnUse('turkey');
                    return;
                }

                TC.terminal.write(TC.gameconfig.messages.noFood);
            }
        },
        'sword': {
            type: 'sword',
            action: function(param) {
                if (TC.player.inventory.indexOf('sword') !== -1) {
                    TC.events.attack.action(param);
                    TC.player.removeFromInventoryOnUse('turkey');
                    return;
                }

                TC.terminal.write(TC.gameconfig.messages.noFood);
            }
        },

        'kick': {
            type: 'kick',
            action: function(param) {
                TC.events.enter.action(param);
                TC.terminal.hideInput();
            }
        },
        'nullEvent': {
            type: 'nullEvent',
            action: function(param) {
                // Do nothing after printing the room message
            }
        },
        'invalid': {
            type: 'invalid',
            param: '',
            action: function(param) {
                TC.terminal.write(TC.gameconfig.messages.inputNotUnderstood);
            }
        }
    },

    player: {
        init: function() {
            this.inventory = [];
            this.possibleInventory = TC.gameconfig.possibleInventory;
        },

        getInventory: function() {
            return this.inventory;
        },

        addToInventory: function(item) {
            this.inventory.push(item);
            this.possibleInventory = this.possibleInventory.filter(function(inv) {
                return item !== inv;
            });
        },

        removeFromInventoryOnUse: function(item) {
            this.inventory = this.inventory.filter(function(inv) {
                return item !== inv;
            });
        }
    },

    keyboard: {
        init: function() {
            window.onkeyup = function(e) {
                if (e.keyCode === 13) { // Enter key
                    var input = TC.terminal.getInput(),
                        token = TC.terminal.parseAndTokenizeInput(input),
                        roomEvent = TC.game.getEventFromID(token) || TC.game.getEventFromInventoryUsage(token) || TC.events.invalid;

                    TC.terminal.echoInput(input);
                    TC.terminal.clearInput();
                    TC.terminal.write(roomEvent.msg);
                    TC.terminal.scrollIntoView(); // Keep terminal in view
                    TC.game.performAction(roomEvent);
                    TC.terminal.scrollIntoView(); // Keep terminal in view
                }
            };
        }
    },

    gameconfig: {
        startRoom: 'Intro',
        messages: {
            cannotUseItemHere: 'Cannot use that item here.',
            emptyInventory: 'There is nothing in your inventory.',
            gameOver: '--- GAME OVER ---<br><br>Refresh this page to try again.',
            inputNotUnderstood: 'Come again?',
            inventoryContents: 'You have the following items in your inventory:',
            inventoryInstructions: 'Type the name of an item to use it.',
            itemAddedToInventory: 'Item added to inventory.',
            makeChoice: 'What would you like to do?',
            nothingToTake: 'There is nothing to take.',
            noAction: 'Nothing to do.',
            noFood: 'You do not have any food to feed the dog!',
            noKey: 'You need a key to unlock it.',
            unlocked: 'Success! It opened.'
        },
        possibleInventory: ['turkey', 'key', 'sword'],
        rooms: {
            'Intro': {
                description: 'Welcome!  The next puzzle is a short interactive text adventure game.',
                roomEvents: [{
                    type: 'enter',
                    choice: 'Enter the game. (Type 1 to select this command.)',
                    msg: 'Stick with it to the end for another puzzlehunt clue!',
                    param: 'Outside'
                }]
            },
            'Outside': {
                description: 'A lonely house looms near, and there<br> the path now ends. If you should dare<br> to go within, beware! Foes, traps, <br>and treachery are near. Your map<br> and choices past do not forget,<br> for they will guide you to your fate.<br> Now go! The treasure lies in wait.<br><br><br>A knight stands solid as a stone in the entrance of the door.',
                alternateDescription: 'The door to the house is ajar. The knight has disappeared.',
                roomEvents: [{
                    type: 'attack',
                    choice: 'Attack the knight.',
                    msg: 'You charge! However, the knight isn\'t impressed. He fells you with a powerful blow.',
                    param: 'death'
                }, {
                    type: 'bribe',
                    choice: 'Bribe the knight.',
                    msg: 'You have impinged on the knight\'s honor. He flies into a rage and cuts you down.',
                    param: 'death'
                }, {
                    type: 'talk',
                    choice: 'Make an empassioned speech about your destiny.',
                    msg: 'The knight is moved by your resolve. He lets you pass.',
                    param: 'Entry'
                }],
                alternateRoomEvents: [{
                    type: 'enter',
                    choice: 'Enter the house.',
                    msg: 'You enter the house.',
                    param: 'Entry'
                }]
            },
            'Entry': {
                description: 'In the entry room of the house, you see a giant staircase leading both up and down. Behind you, a door leads outside.',
                roomEvents: [{
                    type: 'enter',
                    choice: 'Go up the stairs.',
                    msg: 'You go up the stairs.',
                    param: 'StairTop'
                }, {
                    type: 'enter',
                    choice: 'Go down the stairs.',
                    msg: 'You go down the stairs.',
                    param: 'Basement'
                }, {
                    type: 'exit',
                    choice: 'Go back outside.',
                    msg: 'You exit the house.',
                    param: 'Outside'
                }]
            },
            'Basement': {
                description: 'You are now in the basement hallway. To your left you can see the kitchen, to your right a closet. The staircase you used is behind you.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back upstairs.',
                    msg: 'You go back up the stairs.',
                    param: 'Entry'
                }, {
                    type: 'enter',
                    choice: 'Enter the kitchen.',
                    msg: 'You go into the kitchen.',
                    param: 'Kitchen'
                }, {
                    type: 'enter',
                    choice: 'Enter the closet.',
                    msg: 'You enter the closet.',
                    param: 'Closet'
                }]
            },
            'Kitchen': {
                description: 'A turkey leg is sitting on the counter. Perhaps it would make a good snack. The basement hallway lies behind you.',
                alternateDescription: 'The kitchen is empty. The basement hallway lies behind you.',
                roomEvents: [{
                    type: 'take',
                    choice: 'Take a turkey leg.',
                    param: 'turkey'
                }, {
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the basement hallway.',
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the basement hallway.',
                    param: 'Basement'
                }]
            },
            'Closet': {
                description: 'The storage closet is dimly lit and smells faintly of mothballs. A stained coat hangs from a peg on the shelf. The basement hallway lies behind you.',
                alternateDescription: 'The storage closet is dimly lit and smells faintly of mothballs. A stained coat hangs from a peg on the shelf. The basement hallway lies behind you.',
                roomEvents: [{
                    type: 'examine',
                    choice: 'Search the coat.',
                    msg: 'You find a key in the pockets.',
                    param: 'key'
                }, {
                    type: 'exit',
                    choice: 'Return to the basement hallway.',
                    msg: 'You return to the basement hallway.',
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'examine',
                    choice: 'Search the coat.',
                    msg: 'You search the pockets of the coat, but there isn\'t anything there.',
                    param: ''
                }, {
                    type: 'exit',
                    choice: 'Return to the basement hallway.',
                    msg: 'You return to the basement hallway.',
                    param: 'Basement'
                }],
            },
            'StairTop': {
                description: 'At the top of the stairs, you encounter a locked door.',
                alternateDescription: 'You are at the top of the stairs. A key is stuck in the open door before you.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go down the stairs.',
                    msg: 'You go down the stairs.',
                    param: 'Entry'
                }, {
                    type: 'nullEvent',
                    choice: 'Knock on the door.',
                    msg: 'You knock on the door, but no one answers.',
                    param: ''
                }, {
                    type: 'key',
                    hidden: true,
                    choice: 'Use the key.',
                    param: 'Hallway'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back down the stairs.',
                    msg: 'You go back down the stairs.',
                    param: 'Entry'
                }, {
                    type: 'enter',
                    choice: 'Enter the open door.',
                    message: 'You enter the door.',
                    param: 'Hallway'
                }]
            },
            'Hallway': {
                description: 'You enter a room on the top floor of the house. There are three doors in a row. Through the door behind you, a staircase leads down to the main floor.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the stairs.',
                    msg: 'You go back to the stairs.',
                    param: 'StairTop'
                }, {
                    type: 'enter',
                    choice: 'Open the door on the left.',
                    msg: 'You open the door on the left.',
                    param: 'Left'
                }, {
                    type: 'enter',
                    choice: 'Open the door in the middle.',
                    msg: 'You open the door in the middle.',
                    param: 'Middle'
                }, {
                    type: 'enter',
                    choice: 'Open the door on the right.',
                    msg: 'You open the door on the right.',
                    param: 'Right'
                }]
            },
            'Right': {
                description: 'Before you is a small armory. A sword leans in the corner, and on the wall hangs a shield. Behind you is the hallway.',
                alternateDescription: 'Before you is a small armory. There is a shield on the wall. Behind you is the hallway.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the hallway.',
                    param: 'Hallway'
                }, {
                    type: 'take',
                    choice: 'Pick up the sword.',
                    msg: 'You pick up the sword.',
                    param: 'sword'
                }, {
                    type: 'nullEvent',
                    choice: 'Pick up the shield.',
                    msg: 'The shield is fastened to the wall and will not come loose.',
                    param: ''
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the hallway.',
                    param: 'Hallway'
                }, {
                    type: 'nullEvent',
                    choice: 'Pick up the shield.',
                    msg: 'The shield is fastened to the wall and will not come loose.',
                    param: ''
                }]
            },
            'Middle': {
                description: 'You enter a round room.  There are only three things in this room.  The door you came through, a door on the other side of the room, and a two headed dog in the middle.',
                alternateDescription: 'A two-headed dog sleeps contentedly on the floor with a turkey bone under its paw. There is a door on the other side of the room. The exit is behind you.',
                roomEvents: [{
                    type: 'run',
                    choice: 'Run away!',
                    msg: 'You flee in terror.',
                    param: 'Hallway'
                }, {
                    type: 'attack',
                    hidden: true,
                    choice: 'Attack!',
                    msg: 'Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...',
                    param: 'death'
                }, {
                    type: 'turkey',
                    hidden: true,
                    choice: 'Feed the dog a piece of turkey.',
                    msg: 'You rip off a piece of the turkey and throw it on the ground.  The dog is distracted for now! You sneak past.',
                    param: 'Chestroom'
                }, {
                    type: 'sword',
                    hidden: true,
                    choice: 'Feed the dog a piece of turkey.',
                    msg: 'Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...',
                    param: 'death'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You exit to the hallway.',
                    param: 'Hallway'
                }, {
                    type: 'enter',
                    choice: 'Go through the door.',
                    msg: 'You pass through the door.',
                    param: 'Chestroom'
                }]
            },
            'Left': {
                description: 'You hesitate in the doorway before the pitch black room.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Exit to the hallway.',
                    msg: 'The room makes you think twice. You return to the hallway.',
                    param: 'Hallway'
                }, {
                    type: 'attack',
                    choice: 'Enter cautiously.',
                    msg: 'You notice the faint rustling sound too late. You are stricken down by a viper.',
                    param: 'death'
                }]
            },

            'Chestroom': {
                description: 'A shaft of light pierces the ceiling, shining down upon a jewel-encrusted chest. There seems to be an inscription on the lid in an ancient language.',
                roomEvents: [{
                    type: 'kick',
                    choice: 'Read the inscription.',
                    msg: 'NERD.  You slowly sound out the strange and lilting syllables. The dust swirls around you and the chest begins to creak.',
                    param: 'End'
                }, {
                    type: 'kick',
                    choice: 'Kick the chest.',
                    msg: 'You kick the chest, sending dust flying up in a cloud. When the dust finally settles, the chest appears to now be open...',
                    param: 'End'
                }, {
                    type: 'exit',
                    choice: 'Return to face the dog.',
                    msg: 'You return to face the dog.',
                    param: 'Middle'
                }]
            },
            'End': {
                description: 'The chest opens.  Inside, all you find is a small piece of parchment.  You unfold the parchment.  It reads THROWBACK.  Enter it into ClueKeeper to defuse the bomb and move on in your hunt.'
            }
        }
    }
};

/* Make code executable in node and in the browser for testing.
 *
 * In-browser, mock out the module object. (Tests require exporting code as a module.)
 * In node, mock out the window object.
 */

var module = module || {},
    window = window || {};

module.exports = TC;
window.onload = TC.init;
