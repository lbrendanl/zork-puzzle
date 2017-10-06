var TC = {

    init: function() {
        TC.terminal.init('terminal-history', 'terminal-input');
        TC.gameconfig = TC.game.assignIds(TC.gameconfig);
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
        'help': {
            type: 'help',
            action: function(param) {
                TC.terminal.write(TC.gameconfig.messages.help);
            }
        },
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
        'hint': {
            type: 'hint',
            action: function(param) {
                var hintText = TC.game.currentRoom.hint || TC.gameconfig.messages.defaultHint;
                TC.terminal.write(hintText);
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

        'read': {
            type: 'read',
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
            defaultHint: 'Have you visited all the rooms yet?',
            help: 'Here are some things that you can do:<br><br>' +
                '-- ENTER. Go into a room. You can also type the name of the room or the direction. For example, try UP or LEFT.<br><br>' +
                '-- EXIT. Leave the room.<br><br>' +
                '-- TAKE. Try to add an item to your inventory. You can also type the name of the item.<br><br>' +
                '-- FIGHT. Fight the enemies blocking your path.<br><br>' +
                '-- LOOK. Look around the room again.<br><br>' +
                '-- INVENTORY. List the items that you have added to your inventory.To use an item, type the name of the item.<br><br>' +
                '-- HINT. Stuck? Get a hint.',
            inputNotUnderstood: 'Come again?',
            inventoryContents: 'You have the following items in your inventory:',
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
                description: 'Welcome!  The next puzzle is a short interactive text adventure game. <br><br>',
                roomEvents: [{
                    type: 'enter',
                    choice: 'Enter the game. (Type 1 to select this command.)',
                    msg: 'Stick with it to the end for another puzzlehunt clue!',
                    keywords: ['start'],
                    param: 'Outside'
                }]
            },
            'Outside': {
                description: 'A lonely house looms near, and there<br> the path now ends. If you should dare<br> to go within, beware! Foes, traps, <br>and treachery are near. Your map<br> and choices past do not forget,<br> for they will guide you to your fate.<br> Now go! The treasure lies in wait.<br><br><br>A knight stands solid as a stone in the entrance of the door.',
                alternateDescription: 'The door to the house is ajar. The knight has disappeared.',
                hint: 'Can you convince him to let you pass?',
                roomEvents: [{
                    type: 'attack',
                    choice: 'Attack the knight.',
                    msg: 'You charge! However, the knight isn\'t impressed. He fells you with a powerful blow.',
                    keywords: ['fight', 'intimidate'],
                    param: 'death'
                }, {
                    type: 'bribe',
                    choice: 'Bribe the knight.',
                    msg: 'You have impinged on the knight\'s honor. He flies into a rage and cuts you down.',
                    keywords: ['money'],
                    param: 'death'
                }, {
                    type: 'talk',
                    choice: 'Make an empassioned speech about your destiny.',
                    msg: 'The knight is moved by your resolve. He lets you pass.',
                    keywords: ['convince', 'speech'],
                    param: 'Entry'
                }],
                alternateRoomEvents: [{
                    type: 'enter',
                    choice: 'Enter the house.',
                    msg: 'You enter the house.',
                    keywords: ['house', 'door'],
                    param: 'Entry'
                }]
            },
            // Left and right aren't an option in the flow chart,
            // This is an early indicator that the game is slightly different.
            'Entry': {
                description: 'In the entry room of the house, you see a giant staircase leading both up and down.',
                roomEvents: [{
                    type: 'enter',
                    choice: 'Go up the stairs.',
                    msg: 'You go up the stairs.',
                    keywords: ['up'],
                    param: 'StairTop'
                }, {
                    type: 'enter',
                    choice: 'Go down the stairs.',
                    msg: 'You go down the stairs.',
                    keywords: ['down'],
                    param: 'Basement'
                }, {
                    type: 'exit',
                    choice: 'Go back outside.',
                    msg: 'You exit the house.',
                    keywords: ['back', 'outside'],
                    param: 'Outside'
                }]
            },
            'Basement': {
                description: 'You are now in the basement hallway. To your left you can see the kitchen, to your right a closet.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back upstairs.',
                    msg: 'You go back up the stairs.',
                    keywords: ['back', 'up', 'stairs'],
                    param: 'Entry'
                }, {
                    type: 'enter',
                    choice: 'Enter the kitchen.',
                    msg: 'You go into the kitchen.',
                    keywords: ['left', 'kitchen'],
                    param: 'Kitchen'
                }, {
                    type: 'enter',
                    choice: 'Enter the closet.',
                    msg: 'You enter the closet.',
                    keywords: ['right', 'closet'],
                    param: 'Closet'
                }]
            },
            'Kitchen': {
                description: 'A turkey leg is sitting on the counter. Perhaps it would make a good snack.',
                alternateDescription: 'The kitchen is empty.',
                hint: 'It doesn\'t seem like anyone would mind if you take it...',
                roomEvents: [{
                    type: 'take',
                    choice: 'Take a turkey leg.',
                    keywords: ['turkey', 'leg', 'snack'],
                    param: 'turkey'
                }, {
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the basement hallway.',
                    keywords: ['back', 'basement', 'hallway'],
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the basement hallway.',
                    keywords: ['back', 'basement', 'hallway'],
                    param: 'Basement'
                }]
            },
            'Closet': {
                description: 'The storage closet is dimly lit and smells faintly of mothballs. A stained coat hangs from a peg on the shelf.',
                alternateDescription: 'The storage closet is dimly lit and smells faintly of mothballs. A stained coat hangs from a peg on the shelf.',
                hint: 'Maybe you should examine the coat...',
                roomEvents: [{
                    type: 'examine',
                    choice: 'Search the coat.',
                    msg: 'You find a key in the pockets.',
                    keywords: ['coat'],
                    param: 'key'
                }, {
                    type: 'exit',
                    choice: 'Return to the basement hallway.',
                    msg: 'You return to the basement hallway.',
                    keywords: ['leave', 'back', 'hall', 'hallway'],
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'examine',
                    choice: 'Search the coat.',
                    msg: 'You search the pockets of the coat, but there isn\'t anything there.',
                    keywords: ['coat'],
                    param: ''
                }, {
                    type: 'exit',
                    choice: 'Return to the basement hallway.',
                    msg: 'You return to the basement hallway.',
                    keywords: ['leave', 'back', 'hall', 'hallway'],
                    param: 'Basement'
                }],
            },
            'StairTop': {
                description: 'At the top of the stairs, you encounter a locked door.',
                alternateDescription: 'You are at the top of the stairs. A key is stuck in the open door before you.',
                hint: 'If only you had a key...',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back down the stairs.',
                    msg: 'You go back down the stairs.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Entry'
                }, {
                    type: 'key',
                    hidden: true,
                    choice: 'Use the key.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Hallway'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back down the stairs.',
                    msg: 'You go back down the stairs.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Entry'
                }, {
                    type: 'enter',
                    choice: 'Enter the open door.',
                    message: 'You enter the door.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Hallway'
                }]
            },
            'Hallway': {
                description: 'You enter a room on the top floor of the house and see a door on the left and one the right.',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the stairs.',
                    msg: 'You go back to the stairs.',
                    keywords: ['leave', 'back', 'down', 'stairs'],
                    param: 'StairTop'
                }, {
                    type: 'enter',
                    choice: 'Open the door on the left.',
                    msg: 'You open the door on the left.',
                    keywords: ['left'],
                    param: 'Left'
                }, {
                    type: 'enter',
                    choice: 'Open the door on the right.',
                    msg: 'You open the door on the right.',
                    keywords: ['right'],
                    param: 'Right'
                }]
            },
            'Right': {
                description: 'Before you is a small armory. A sword leans in the corner, and on the wall hangs a shield.',
                alternateDescription: 'Before you is a small armory. There is a shield on the wall.',
                hint: 'Perhaps you should take something. It might be dangerous up ahead...',
                roomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the hallway.',
                    keywords: ['leave', 'back', 'hallway', 'hall'],
                    param: 'Hallway'
                }, {
                    type: 'take',
                    choice: 'Pick up the sword.',
                    msg: 'You pick up the sword.',
                    keywords: ['sword'],
                    param: 'sword'
                }, {
                    type: 'nullEvent',
                    choice: 'Pick up the shield.',
                    msg: 'The shield is fastened to the wall and will not come loose.',
                    keywords: ['shield'],
                    param: ''
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You return to the hallway.',
                    keywords: ['leave', 'back', 'hallway', 'hall'],
                    param: 'Hallway'
                }, {
                    type: 'take',
                    choice: 'Pick up the shield.',
                    msg: 'The shield is fastened to the wall and will not come loose.',
                    keywords: ['shield'],
                    param: ''
                }]
            },
            'Left': {
                description: 'You enter a round room.  There are only three things in this room.  The door you came through, a door on the other side of the room, and a two headed dog in the middle.',
                alternateDescription: 'A two-headed dog sleeps contentedly on the floor with a turkey bone under its paw. There is a door on the other side of the room. The exit is behind you.',
                hint: 'The dog looks hungry...and you look tasty.',
                roomEvents: [{
                    type: 'run',
                    choice: 'Run away!',
                    msg: 'You flee in terror.',
                    keywords: ['flee'],
                    param: 'Hallway'
                }, {
                    type: 'attack',
                    hidden: true,
                    choice: 'Attack!',
                    msg: 'Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...',
                    keywords: ['sword'],
                    param: 'death'
                }, {
                    type: 'turkey',
                    hidden: true,
                    choice: 'Feed the dog a piece of turkey.',
                    msg: 'You rip off a piece of the turkey and throw it on the ground.  The dog is distracted for now! You sneak past.',
                    keywords: ['snack'],
                    param: 'Chestroom'
                }, {
                    type: 'sword',
                    hidden: true,
                    choice: 'Feed the dog a piece of turkey.',
                    msg: 'Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...',
                    keywords: ['snack'],
                    param: 'death'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    choice: 'Go back to the hallway.',
                    msg: 'You exit to the hallway.',
                    keywords: ['back', 'leave'],
                    param: 'Hallway'
                }, {
                    type: 'enter',
                    choice: 'Go through the door.',
                    msg: 'You pass through the door.',
                    keywords: ['door'],
                    param: 'Chestroom'
                }]
            },
            'Chestroom': {
                description: 'A shaft of light pierces the ceiling, shining down upon a jewel-encrusted chest. There seems to be an inscription on the lid in an ancient language.',
                hint: 'The language seems familiar somehow--if you squint, you might be able to read it.',
                roomEvents: [{
                    type: 'read',
                    choice: 'Read the inscription.',
                    msg: 'You slowly sound out the strange and lilting syllables. The dust swirls around you and the chest begins to creak.',
                    keywords: ['inscription', 'examine', 'squint'],
                    param: 'End'
                }, {
                    type: 'nullEvent',
                    choice: 'Try to force the chest open.',
                    msg: 'You kick and pound on the chest, sending dust flying up in a cloud. When the dust finally settles, the inscription gleams in the sun.',
                    keywords: ['kick', 'pound'],
                    param: ''
                }, {
                    type: 'exit',
                    choice: 'Return to face the dog.',
                    msg: 'You return to face the dog.',
                    keywords: ['back', 'leave'],
                    param: 'Left'
                }]
            },
            'End': {
                description: 'The chest opens.  Inside, all you find is a small piece of parchment.  You unfold the parchment.  It reads SUPER_COOL_CODEWORD.  Enter it into ClueKeeper to defuse the bomb and move on in your hunt.'
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
