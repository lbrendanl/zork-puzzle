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
                TC.terminal.write("Allowable actions are: ");            
                room.roomEvents.forEach(function (roomEvent) {
                    TC.terminal.write(roomEvent.number + ") " + roomEvent.text);
                });

                TC.terminal.write();
            },
    
            mapTokensToCommand: function(tokens) {
                var events = TC.events;
                var cmd;
    
                // TODO make more robust
                var token = tokens[0];
                TC.game.currentRoom.roomEvents.forEach(function (event) {
                    if (event.number == token && token !== '') {
                        cmd = event.cmd;
                    }
                });

                if (cmd) {
                    return cmd;
                } else {
                    TC.terminal.write(TC.gameconfig.messages.inputNotUnderstood);      
                    return null;                             
                }
            },
    
            getRoomEvent: function(cmd, number, roomEvents) {  
                // Global options
                if (cmd === 'help') {
                    return TC.events.help;
                } else if (cmd == 'inventory') {
                    return TC.events.inventory;
                }

                var filteredRoomMatches = roomEvents.filter(function(evt) {
                    return (cmd === evt.cmd && number == evt.number);
                });

                if (filteredRoomMatches.length > 0) {
                    return filteredRoomMatches[0];
                }
    
                return TC.events.invalid;
    
            },

            attemptUseItem: function(item) {
                if (TC.player.inventory.indexOf(item) < 0) {
                    Terminal.write("You don't have that item.");
                    return;
                }
                
                switch (item) {
                    case "turkey": 
                        if (TC.game.currentRoom === "Dog") {
                            TC.events.enter.action("Chestroom");
                        } else {
                            Terminal.write("You can't use that here.");
                        }
                        break;
                    default:
                }
            },
    
            performAction: function(roomEvent) {
                TC.events[roomEvent.cmd].action(roomEvent.param);
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
                    TC.terminal.write("Your Inventory:");
                    TC.terminal.write(inv.join(', '));
                    TC.terminal.write();
                    TC.terminal.write("Type the name of the item to use it.");
                    
                },
                cmd: 'inventory'
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
                        TC.terminal.showInput();
                    }, 200);
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
                        return;
                    }
    
                    TC.player.addToInventory(param);
                    TC.terminal.write(TC.gameconfig.messages.itemAddedToInventory);
                    TC.terminal.write('-- ' + param);
                }
            },
            'drop': {
                type: 'drop',
                action: function(param) {
                    if (typeof param === 'undefined' || param === '') {
                        TC.terminal.write(TC.gameconfig.messages.inputNotUnderstood);
                        TC.terminal.write(TC.gameconfig.messages.nothingToTake);
                        return;
                    }
    
                    TC.player.dropFromInventory(param);
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
                    if (param === 'death') {
                        TC.events.death.action(param);
                        return;
                    }
                    TC.events.enter.action(param);
                }
            },
            'speech': {
                type: 'speech',
                action: function(param) {
                    if (param === 'death') {
                        TC.events.death.action(param);
                        return;
                    }
                    TC.events.enter.action(param);
                }
            },
            'death': {
                type: 'death',
                action: function(param) {
                    TC.terminal.write(TC.gameconfig.messages.gameOver);
                    TC.terminal.write();
                    TC.terminal.write("Refresh this page to try again.");                
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
                        TC.events.enter.action(param);
                        return;
                    }
                    TC.terminal.write(TC.gameconfig.messages.locked);
                },
                cmd: 'inventory'
            },
            'open': {
                type: 'open',
                action: function(param) {
                    TC.terminal.write(TC.gameconfig.messages.locked);
                }
            },
            'turkey': {
                type: 'turkey',
                action: function(param) {
                    if (TC.player.inventory.indexOf('turkey') !== -1) {
                        TC.events.enter.action(param);
                        return;
                    }
    
                    TC.terminal.write(TC.gameconfig.messages.noFood);
                },
                cmd: 'inventory'
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
            }
        },
    
        keyboard: {
            init: function() {
                window.onkeyup = function(e) {
                    if (e.keyCode === 13) { // Enter key
                        var input = TC.terminal.getInput(),
                            tokens = TC.terminal.parseAndTokenizeInput(input),
                            cmd = TC.game.mapTokensToCommand(tokens),
                            roomEvent;


                        TC.terminal.clearInput();

                        if (cmd) {
                            roomEvent = TC.game.getRoomEvent(cmd, tokens[0], TC.game.currentRoom.roomEvents);
                            TC.terminal.write(roomEvent.msg);
                            TC.game.performAction(roomEvent);
                        } else {
                            var inventoryCmd;
                            TC.gameconfig.possibleInventory.forEach(function (item) {
                                if (token === item) {
                                    inventoryCmd = item;
                                }
                            });

                            if (inventoryCmd) {
                                TC.game.attemptUseItem(inventoryCmd);
                            } else {
                                console.error("Unexpected error");
                            }
                        }
                    }
                };
            }
        },
    
        gameconfig: {
            startRoom: 'Intro',
            messages: {
                emptyInventory: 'There is nothing in your inventory.',
                gameOver: 'Game Over',
                inputNotUnderstood: 'Come again?',
                itemAddedToInventory: 'Item added to inventory.',
                locked: 'It holds fast.',
                noAction: 'Nothing to do.',
                noFood: 'You do not have any food to feed the dog!',
                nothingToTake: 'There is nothing to take.',
                unlocked: 'Success! It opened.'
            },
            possibleInventory: ['turkey', 'key', 'sword', 'shield'],
            rooms: {
                'Intro': {
                    description: 'Welcome!  The next puzzle is a short interactive text adventure game. It may have a hint of familiarity. When you are ready, type "enter"',
                    roomEvents: [{
                        number: 1,
                        text: 'Enter the game (type 1 to select this command).',
                        msg: 'Stick with it to the end for another puzzlehunt clue!',
                        cmd: 'enter',
                        param: 'Outside'
                    }]
                },
                'Outside': {
                    description: 'You see an old, decrepit house before you. <br>The treasure you seek is somewhere inside. <br>But beware, many traps and eneminies await. <br>But follow your map and you will make it through.<br><br>You see a large knight standing blocking the entrance to the house.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        number: 1,
                        text: 'Attack the knight.',
                        msg: 'The knight overpowers you and beats you in single combat.',
                        cmd: 'attack',
                        param: 'death'
                    }, {
                        number: 2,
                        text: 'Bribe the knight.',
                        msg: 'The knight is too honorable for that, he charges at you and you are forced to run.',
                        cmd: 'bribe',                    
                        param: 'death'
                    }, {
                        number: 3,
                        text: 'Make an empassioned speech about your destiny.',
                        msg: 'You are very persuasive, the knight lets you pass, for now.',
                        cmd: 'speech',                                      
                        param: 'Entry'
                    }]
                },
                // Left and right aren't an option in the flow chart,
                // This is an early indicator that the game is slightly different.
                'Entry': {
                    description: 'In the entry room of the house, you see a giant staircase leading both up and down.', // There are also doors to your left and right.
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        number: 1,
                        text: 'Go up the stairs.',
                        msg: 'You proceed up the stairs.',
                        cmd: 'enter',                                      
                        param: 'StairTop'
                    }, {
                        number: 2,
                        text: 'Go down the stairs.',
                        msg: 'You head toward the stairs and travel down.',
                        cmd: 'enter',                                      
                        param: 'Basement'
                    },
                    {
                        number: 3,
                        text: 'Go back outside.',
                        msg: 'You leave the house.',
                        cmd: 'exit',                                      
                        param: 'Outside'
                    }]
                },
                'Basement': {
                    description: 'You are now in the basement hallway. To your left you can see the kitchen, to your right a closet.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        number: 1,
                        text: 'Go back upstairs.',
                        msg: 'You return to the main floor.',
                        cmd: 'exit',                                      
                        param: 'Entry'
                    }, {
                        number: 2,
                        text: 'Go to the kitchen.',
                        msg: 'You proceed up the kitchen.',
                        cmd: 'enter',                                      
                        param: 'Kitchen'
                    }, {
                        number: 3,
                        text: 'Go up the closet.',
                        msg: 'You proceed up the closet.',
                        cmd: 'enter',                                      
                        param: 'Closet'
                    }]
                },
                'Kitchen': {
                    description: 'You find yourself in a large kitchen. Some snacks are on the counter.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        number: 1,
                        text: 'Take a turkey leg..',
                        cmd: 'take',                                   
                        param: 'turkey'
                    }, {
                        number: 2,
                        text: 'Go back to the hallway.',
                        msg: 'You return to the basement hallway.',
                        cmd: 'exit',                                      
                        param: 'Basement'
                    }]
                },
                'Closet': {
                    description: 'The storage closet is dimly lit and smells faintly of mothballs. Above you, there is a shelf.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        type: 'look',
                        msg: 'You reach through cobwebs to the far back of the shelf. There you find a key.',
                        keywords: ['reach', 'shelf'],
                        param: 'key'
                    }, {
                        type: 'exit',
                        msg: 'You return to the basement hallway.',
                        keywords: ['leave', 'back', 'hall', 'hallway'],
                        param: 'Basement'
                    }]
                },
                'StairTop': {
                    description: 'At the top of the stairs, you encounter a locked door.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
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
                    }]
                },
                'Hallway': {
                    description: 'You enter a room on the top floor of the house and see a door on the left and one the right.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
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
                    description: 'Before you is a small armory. A sword leans in the corner next to a plate of armor, and on the wall hangs a shield.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
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
                    }]
                },
                'Dog': {
                    description: 'You enter a round room.  There are only three things in this room.  The door you came through, a door on the other side of the room, and a two headed dog in the middle.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        type: 'exit',
                        msg: 'You flee in terror.',
                        keywords: ['leave', 'back', 'run', 'flee'],
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
                    }]
                },
                'Chestroom': {
                    description: 'You enter a giant room with tall ceilings.  A ray of light shines down from the ceiling in the center of the room. The light shines down upon a jewel encrusted chest. The chest appears locked, but there is an inscription in an ancient language around the outside of the chest.',
                    roomEvents: [{
                        number: 0,
                        text: 'View inventory.',
                        cmd: 'inventory'
                    }, {
                        type: 'read',
                        msg: 'You read the inscription.',
                        keywords: ['inscription', 'examine', 'look'],
                        param: 'End'
                    }, {
                        type: 'open',
                        msg: '',
                        keywords: ['chest'],
                        param: ''
                    }, {
                        type: 'exit',
                        msg: 'You return to face the dog.',
                        keywords: ['dog'],
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