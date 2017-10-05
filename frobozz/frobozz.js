var TC = {

    init: function() {
        TC.terminal.init('terminal-history', 'terminal-input');
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
            return input.trim().toLowerCase().split(' ');
        },

        clearInput: function() {
            this.input.value = '';
        },

        clearHistory: function() {
            this.history.innerHTML = '';
        }
    },

    game: {
        init: function(config) {
            this.config = config;
            this.setCurrentRoom(this.config.startRoom);
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
            TC.terminal.write(room.description);
            TC.terminal.write();
        },

        mapTokensToEvents: function(tokens) {
            var events = TC.events,
                matches = [];

            for (var t = 0; t < tokens.length; t++) {
                if (typeof events[tokens[t]] !== 'undefined') {
                    matches.push(events[tokens[t]].type);
                }
            }
            return matches;
        },

        getRoomEvent: function(mappedEvents, roomEvents, tokens) {
            var filteredRoomMatches = [],
                tokenKeywordMatches = [];
            // Helper functions
            function areArraysOverlapping(arr1, arr2) {
                for (var i = 0; i < arr1.length; i++) {
                    for (var j = 0; j < arr2.length; j++) {
                        if (arr1[i] === arr2[j]) {
                            return true;
                        }
                    }
                }

                return false;
            }

            function compareRoomsToTokens(rooms, tokens) {
                if (rooms.length >= 1) {
                    for (var i = 0; i < rooms.length; i++) {
                        if (areArraysOverlapping(tokens, rooms[i].keywords)) {
                            return rooms[i];
                        }
                    }
                }
                return TC.events.invalid;
            }

            function roomContainsEvent (eventType) {
                for (var i = 0; i < roomEvents.length; i++) {
                    if (roomEvents[i].type === eventType) {
                        return true;
                    }
                }
                return false;
            }

            // Global options
            if (mappedEvents.indexOf('help') !== -1) {
                return TC.events.help;
            } else if (mappedEvents.indexOf('inventory') !== -1) {
                return TC.events.inventory;
            } else if (mappedEvents.indexOf('look') !== -1) {
                return TC.events.look;
            } else if (!roomContainsEvent('take') && mappedEvents.indexOf('take') !== -1) {
                // When the room doesn't have a take event, stop processing.
                // Let the take event default to a nothing to take message because there is no room param passed.
                return TC.events.take;
            }


            // Logic to decide on room events
            if (mappedEvents.length === 1) {
                if (roomEvents.length === 1 && mappedEvents[0] === roomEvents[0].type) {
                    return roomEvents[0];
                }

                filteredRoomMatches = roomEvents.filter(function(evt) {
                    if (mappedEvents[0] === evt.type) {
                        return true;
                    }
                });

                if (filteredRoomMatches.length === 1) {
                    return filteredRoomMatches[0];
                }
                return compareRoomsToTokens(filteredRoomMatches, tokens);

            } else if (mappedEvents.length < 1) {
                return compareRoomsToTokens(roomEvents, tokens);
            }

            return TC.events.invalid;

        },

        performAction: function(roomEvent) {
            TC.events[roomEvent.type].action(roomEvent.param);
        },

        switchToAlternateDescAndEvents: function(room) {
            room.description = room.alternateDescription;
            room.roomEvents = room.alternateRoomEvents;
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
                TC.terminal.write(inv.join(', '));
            }
        },
        'look': {
            type: 'look',
            action: function(param) {
                TC.terminal.write(TC.game.currentRoom.description);
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
                }

                TC.terminal.hideInput();

                window.setTimeout(function() {
                    TC.terminal.clearHistory();
                    TC.game.setCurrentRoom(param);

                    var isLastRoom = (typeof TC.game.currentRoom.roomEvents === 'undefined');
                    if (!isLastRoom) {
                        TC.terminal.showInput();
                    }
                }, 1500);
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
            }
        },
        'attack': {
            type: 'attack',
            action: function(param) {
                if (param === 'death') {
                    TC.events.death.action(param);
                    return;
                }
                TC.game.switchToAlternateDescAndEvents(TC.game.currentRoom);
                TC.events.enter.action(param);
            }
        },
        'death': {
            type: 'death',
            action: function(param) {
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
                TC.terminal.write(TC.gameconfig.messages.locked);
            }
        },
        'open': {
            type: 'open',
            action: function(param) {
                TC.terminal.write(TC.gameconfig.messages.locked);
            }
        },
        'feed': {
            type: 'feed',
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
        'read': {
            type: 'read',
            action: function(param) {
                TC.events.enter.action(param);
                TC.terminal.hideInput();
            }
        },
        'knock': {
            type: 'knock',
            action: function(param) {
                // Do nothing.
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
                        tokens = TC.terminal.parseAndTokenizeInput(input),
                        mappedEvents = TC.game.mapTokensToEvents(tokens),
                        roomEvent = TC.game.getRoomEvent(mappedEvents, TC.game.currentRoom.roomEvents, tokens);

                    TC.terminal.echoInput(input);
                    TC.terminal.clearInput();
                    TC.terminal.write(roomEvent.msg);
                    TC.game.performAction(roomEvent);
                }
            };
        }
    },

    gameconfig: {
        startRoom: 'Intro',
        messages: {
            emptyInventory: 'There is nothing in your inventory.',
            gameOver: 'Game Over',
            help: 'Here are some things that you can do:<br><br>' +
					'-- ENTER. Go into a room. You can also type the name of the room or the direction. For example, try UP or LEFT.<br><br>' +
					'-- EXIT. Leave the room.<br><br>' +
					'-- TAKE. Try to add an item to your inventory. You can also type the name of the item.<br><br>' +
					'-- FIGHT. Fight the enemies blocking your path.<br><br>' +
					'-- LOOK. Look around the room again.<br><br>' +
					'-- INVENTORY. List the items that you have added to your inventory.To use an item, type the name of the item.<br><br>' +
					'-- HINT. Stuck? Get a hint.',
            inputNotUnderstood: 'Come again?',
            itemAddedToInventory: 'Item added to inventory.',
            nothingToTake: 'There is nothing to take.',
            locked: 'You try to open it, but it holds fast.',
            noAction: 'Nothing to do.',
            noFood: 'You do not have any food to feed the dog!',
            unlocked: 'Success! It opened.'
        },
        possibleInventory: ['turkey', 'key', 'sword'],
        rooms: {
            'Intro': {
                description: 'Welcome to the TC text adventure! <br><br> Type HELP for tips on how to play. When you are ready to continue, type ENTER.',
                roomEvents: [{
                    type: 'enter',
                    msg: 'Stick with it to the end for another puzzlehunt clue!',
                    keywords: ['start'],
                    param: 'Outside'
                }]
            },
            'Outside': {
                description: 'You see an old, decrepit house before you. <br>The treasure you seek is somewhere inside. <br>But plenty of traps and obstacles stand in your way. <br>There is something familiar about this place.... <br><br>You see a large knight standing blocking the entrance to the house.',
                alternateDescription: 'The door to the house is ajar. The knight mutters something in his stupor, but continues to lie still.',
                roomEvents: [{
                    type: 'attack',
                    msg: 'Luck shines upon you. The knight trips mid-swing, and knocks himself out.',
                    keywords: ['fight'],
                    param: 'Entry'
                }, {
                    type: 'run',
                    msg: 'You try to run, but the knight is too fast. He stabs you in the back.',
                    keywords: ['flee', 'leave'],
                    param: 'death'
                }],
                alternateRoomEvents: [{
                    type: 'enter',
                    msg: 'You enter the house.',
                    keywords: ['house', 'door'],
                    param: 'Entry'
                }]
            },
            // Left and right aren't an option in the flow chart,
            // This is an early indicator that the game is slightly different.
            'Entry': {
                description: 'In the entry room of the house, you see a giant staircase leading both up and down.', // There are also doors to your left and right.
                roomEvents: [{
                        type: 'enter',
                        msg: 'You go up the stairs.',
                        keywords: ['up'],
                        param: 'StairTop'
                    }, {
                        type: 'enter',
                        msg: 'You go down the stairs.',
                        keywords: ['down'],
                        param: 'Basement'
                    }, {
                        type: 'exit',
                        msg: 'You exit the house.',
                        keywords: ['back', 'outside'],
                        param: 'Outside'
                    }
                ]
            },
            'Basement': {
                description: 'You are now in the basement hallway. To your left you can see the kitchen, to your right a closet.',
                roomEvents: [{
                    type: 'exit',
                    msg: 'You go back up the stairs.',
                    keywords: ['back', 'up', 'stairs'],
                    param: 'Entry'
                }, {
                    type: 'enter',
                    msg: 'You go into the kitchen.',
                    keywords: ['left', 'kitchen'],
                    param: 'Kitchen'
                }, {
                    type: 'enter',
                    msg: 'You enter the closet.',
                    keywords: ['right', 'closet'],
                    param: 'Closet'
                }]
            },
            'Kitchen': {
                description: 'A turkey leg is sitting on the counter.',
                alternateDescription: 'The kitchen is empty.',
                roomEvents: [{
                    type: 'take',
                    keywords: ['turkey', 'leg'],
                    param: 'turkey'
                }, {
                    type: 'exit',
                    msg: 'You return to the basement hallway.',
                    keywords: ['basement', 'hallway'],
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    msg: 'You return to the basement hallway.',
                    keywords: ['basement', 'hallway'],
                    param: 'Basement'
                }]
            },
            'Closet': {
                description: 'The storage closet is dimly lit and smells faintly of mothballs. Above you, there is a shelf.',
                alternateDescription: 'The storage closet is dimly lit and smells faintly of mothballs. Above you, there is a shelf.',
                roomEvents: [{
                    type: 'examine',
                    msg: 'You reach through cobwebs to the far back of the shelf. There you find a key.',
                    keywords: ['reach', 'shelf'],
                    param: 'key'
                }, {
                    type: 'exit',
                    msg: 'You return to the basement hallway.',
                    keywords: ['leave', 'back', 'hall', 'hallway'],
                    param: 'Basement'
                }],
                alternateRoomEvents: [{
                    type: 'examine',
                    msg: 'You reach through cobwebs to the far back of the shelf. A spider crawls over your hand, but there is nothing else there.',
                    keywords: ['reach', 'shelf'],
                    param: ''
                }, {
                    type: 'exit',
                    msg: 'You return to the basement hallway.',
                    keywords: ['leave', 'back', 'hall', 'hallway'],
                    param: 'Basement'
                }],
            },
            'StairTop': {
                description: 'At the top of the stairs, you encounter a locked door.',
                alternateDescription: 'You are at the top of the stairs. A key is stuck in the open door before you.',
                roomEvents: [{
                    type: 'exit',
                    msg: 'You go back down the stairs.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Entry'
                }, {
                    type: 'knock',
                    msg: 'You knock on the door, but no one responds.',
                    keywords: [],
                    param: ''
                }, {
                    type: 'open',
                    msg: '',
                    keywords: [],
                    param: ''
                }, {
                    type: 'key',
                    msg: '',
                    keywords: ['unlock'],
                    param: 'Hallway'
                }],
                alternateRoomEvents: [{
                    type: 'exit',
                    msg: 'You go back down the stairs.',
                    keywords: ['leave', 'back', 'stairs', 'down'],
                    param: 'Entry'
                }, {
                    type: 'open',
                    msg: '',
                    keywords: [],
                    param: ''
                }],
            },
            'Hallway': {
                description: 'You enter a room on the top floor of the house and see a door on the left and one the right.',
                roomEvents: [{
                    type: 'exit',
                    msg: 'You go back down the stairs.',
                    keywords: ['leave', 'back', 'down', 'stairs'],
                    param: 'Entry'
                }, {
                    type: 'enter',
                    msg: 'You open the door on the left.',
                    keywords: ['left'],
                    param: 'Left'
                }, {
                    type: 'enter',
                    msg: 'You open the door on the right.',
                    keywords: ['right'],
                    param: 'Right'
                }]
            },
            'Right': {
                description: 'Before you is a small armory. A sword leans in the corner, and on the wall hangs a shield.',
                alternateDescription: 'Before you is a small armory. There is a shield on the wall.',
                roomEvents: [{
                        type: 'exit',
                        msg: 'You return to the hallway.',
                        keywords: ['leave', 'back', 'hallway', 'hall'],
                        param: 'Hallway'
                    }, {
                        type: 'take',
                        msg: 'You pick up the sword.',
                        keywords: ['sword'],
                        param: 'sword'
                    }, {
                        type: 'take',
                        msg: 'The shield is fastened to the wall and will not come loose.',
                        keywords: ['shield'],
                        param: ''
                    }
                ],
                alternateRoomEvents: [{
                        type: 'exit',
                        msg: 'You return to the hallway.',
                        keywords: ['leave', 'back', 'hallway', 'hall'],
                        param: 'Hallway'
                    }, {
                        type: 'take',
                        msg: 'The shield is fastened to the wall and will not come loose.',
                        keywords: ['shield'],
                        param: ''
                    }
                ]
            },
            'Left': {
                description: 'You enter a round room.  There are only three things in this room.  The door you came through, a door on the other side of the room, and a two headed dog in the middle.',
                alternateDescription: 'A two-headed dog sleeps contentedly on the floor with a turkey bone under its paw. There is a door on the other side of the room. The exit is behind you.',
                roomEvents: [{
                        type: 'run',
                        msg: 'You flee in terror.',
                        keywords: ['flee'],
                        param: 'Hallway'
                    }, {
                        type: 'exit',
                        msg: 'You slowly back away.',
                        keywords: ['back', 'leave'],
                        param: 'Hallway'
                    }, {
                        type: 'attack',
                        msg: 'Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...',
                        keywords: ['sword'],
                        param: 'death'
                    }, {
                        type: 'feed',
                        msg: 'You rip off a piece of the turkey and throw it on the ground.  The dog is distracted for now! You sneak past.',
                        keywords: ['turkey'],
                        param: 'Chestroom'
                    }
                ],
                alternateRoomEvents: [{
                        type: 'exit',
                        msg: 'You exit to the hallway.',
                        keywords: ['back', 'leave'],
                        param: 'Hallway'
                    }, {
                        type: 'enter',
                        msg: 'You pass through the door.',
                        keywords: ['door'],
                        param: 'Chestroom'
                    }]
            },
            'Chestroom': {
                description: 'You enter a giant room with tall ceilings.  A ray of light shines down from the ceiling in the center of the room. The light shines down upon a jewel encrusted chest. The chest appears locked, but there is an inscription in an ancient language around the outside of the chest.',
                roomEvents: [{
                    type: 'read',
                    msg: 'You read the inscription, slowly sounding out the strange and lilting syllables. The dust swirls around you and the chest begines to creak.',
                    keywords: ['inscription', 'examine'],
                    param: 'End'
                }, {
                    type: 'open',
                    msg: '',
                    keywords: ['unlock', 'chest'],
                    param: ''
                }, {
                    type: 'exit',
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
