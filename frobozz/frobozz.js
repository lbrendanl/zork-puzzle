window.onload = start;

// TODO make this sound nice and rhymey
var intro = [
    'You see an old, decrepit house before you.',
    'The treasure you seek is somewhere inside.',
    'But plenty of traps and obstacles stand in your way.',
    'There is something familiar about this place....'
]

var inventory = [];

var inventoryCommands = ['turkey', 'key', 'plate of armor', 'sword']

var introIndex = 0;
var interval;

function start() {
    Terminal.init('terminal-history', 'terminal-input');
    interval = setInterval(() => {
        Terminal.write(intro[introIndex]);
        introIndex++;
        if (introIndex >= intro.length) {
            clearInterval(interval);
            setTimeout(() => { 
                Game.init(gameconfig);
                Keyboard.init();
            }, 2000);
        }
    }, 2000);
}

var Terminal = {
    init: function (historyDivId, inputId) {
        this._history = document.getElementById(historyDivId);
        this._input = document.getElementById(inputId);
    },

    write: function (text) {
        if (typeof text !== 'undefined') {
            this._history.innerHTML += text;
        }

        this._history.innerHTML += '<br />';
    },

    clearHistory: function () {
        this._history.innerHTML = '';
    },

    parseInput: function () {
        Terminal.write();
        Terminal.write(' > ' + this._input.value);
        Terminal.write();
        Game.processCmd(this._input.value);
    },

    clearInput: function () {
        this._input.value = '';
    }
};

var Game = {
    init: function (config) {
        this._config = config;
        this.loadRoom(this._config.startRoom);
    },

    loadRoom: function (roomName) {
        this._currentRoomName = roomName;
        var room = this._config.rooms[roomName];

        Terminal.clearHistory();
        Terminal.write(room.description);
        Terminal.write();
        Terminal.write(this._config.messages.instructions);
        Terminal.write();

        Terminal.write('0 - View Inventory.');
        
        for (var choice in room.choices) {
            Terminal.write(choice + ' - ' + room.choices[choice].description);
        }

        Terminal.write();
    },

    processCmd: function (cmd) {
        if (cmd === '0') {
            this.listInventory();
            return;
        };

        var room = this._config.rooms[this._currentRoomName];

        for (var i in inventoryCommands) {
            if (cmd === inventoryCommands[i]) {
                this.attemptToUseItem(cmd);
                return;
            }
        }

        for (var choice in room.choices) {
            var roomInfo = room.choices[choice];
            if (cmd.trim() == choice.trim()) {
                if (roomInfo.item) {
                    if (inventory.indexOf(roomInfo.item) >= 0) {
                        Terminal.write("You can't pick up any more of that item");
                    } else {
                        Terminal.write("You have found a " + roomInfo.item + " and added it to your inventory.");
                        inventory.push(roomInfo.item);                        
                    }
                                        
                    return;
                } else if (roomInfo.death) {
                    this.gameOver(roomInfo.death);
                    return;
                } else if (roomInfo.tryItem) {
                    this.attemptToUseItem(roomInfo.tryItem, roomInfo.deathWithoutItem);
                    return;
                } else if (roomInfo !== '') {
                    this.loadRoom(roomInfo.success);
                    return;
                }

                Terminal.write(this._config.messages.noAction);
                return;
            }
        }

        Terminal.write(this._config.messages.inputNotUnderstood);
    },

    gameOver: function(cause) {
        Terminal.write(cause);
        Terminal.write("Game Over......");
        setTimeout(() => {
            location.reload();
        }, 5000);
    },

    listInventory: function() {
        Terminal.write('Your Investory: \n');
        if (inventory.length === 0) {
            Terminal.write('Empty.  Keep exploring!');
        } else {
            for (var item in inventory) {
                Terminal.write(inventory[item]);
            }
            Terminal.write('\nYou can type the name of an item to attempt to use it.');            
        }
    },

    attemptToUseItem: function(item, deathMessage) {
        if (inventory.indexOf(item) < 0) {
            Terminal.write("You don't have that item in your inventory.");
            return;
        } 
        
        switch (item) {
            case 'turkey':
                if (this._currentRoomName === "Dog") {
                    this.loadRoom("Final1");
                    return;                    
                }
                break;
            case 'key':
                if (this._currentRoomName === "StairTop") {
                    this.loadRoom("Hallway");
                    return;                    
                }
                break;
            case 'plate of armor':
                if (this._currentRoomName === "Middle") {
                    if (inventory.indexOf(item) < 0) {
                        gameOver(deathMessage);
                    } else { 
                        this.loadRoom("Dog");
                    }

                    return;                    
                }
                break;
            case 'sword':
                if (this._currentRoomName === "Dog") {
                    gameOver("You swing your sword at the Dog.  Did I mention it had two heads? You manage to injure the left head as the right head lunges at you...");
                    return;
                } else if (this._currentRoomName === "Outside") {
                    Terminal.write("You best the knight in single combat, it was a glorious but short fight.");
                    Terminal.write("With his dying breath, the knight leans in and says.....");
                    Terminal.write("Game designers Jared and Brendan are very impressed with your adventuresome spirit.  Hope to see you at the end of the hunt!");
                    return;
                }
                break;
            default: 
                break;
        }

        Terminal.write("You can't use that here.");
    }
};

var Keyboard = {
    init: function () {
        window.onkeyup = function (e) {
            if (e.keyCode === 13) {
                Terminal.parseInput();
                Terminal.clearInput();
            }
        };
    }
};

var gameconfig = {
    startRoom: 'Outside',
    messages: {
        instructions: 'What would you like to do?',
        inputNotUnderstood: 'Come again?',
        noAction: 'Nothing to do.'
    },
    rooms: {
        'Outside': {
            description: 'You see a large knight standing blocking the entrance to the house.',
            choices: {
                '1': { description: 'Attack him with your sword', tryItem: 'sword', deathWithoutItem: 'Sorry, you do not have a sword.' },
                '2': { description: 'Make an empassioned speach about your destiny.', success: 'Entry' },
                '3': { description: 'Bribe the guard', death: 'The knight is too honorable for that...' }
            }
        },
        // Left and right aren't an option in the flow chart,
        // This is an early indicator that the game is slightly different.
        'Entry': {
            description: 'In the entry room of the house, you see a giant staircase leading both up and down.  There are also doors to your left and right.',
            choices: {
                '1': { description: 'Go up', success: 'StairTop' },
                '2': { description: 'Go down', success: 'Basement' },
                '3': { description: 'Go left', death: 'TODO' },
                '4': { description: 'Go right', death: 'TODO' },
                '5': { description: 'Leave the house', success: 'Outside' }
            }
        },
        'Basement': {
            description: 'You come upon the basement and enter the basement hallway. To your left you can see the kitchen, to your right a closet.',
            choices: {
                '1': { description: 'Go back upstairs', success: 'Entry' },
                '2': { description: 'Go to the kitchen', success: 'Kitchen' },
                '3': { description: 'Go to the closet', success: 'Closet' }
            }
        },
        'Kitchen': {
            description: 'You are in the kitchen.',
            choices: {
                '1': { description: 'Grab a turkey leg for the road.', item: 'turkey' },
                '2': { description: 'Return to the basement hallway.', success: 'Basement' }
            }
        },
        'Closet': {
            description: 'You enter a dimly lit storage closet.',
            choices: {
                '1': { description: 'Look around the closet for item.', item: 'key' },
                '2': { description: 'Return to the basement hallway.', success: 'Basement' }
            }
        },
        'StairTop': {
            description: 'At the top of the stairs, you encounter a locked door.',
            choices: {
                '1': { description: 'Go back downstairs.', success: 'Entry' },
                '2': { description: 'Knock on the door.', death: 'A trap door opens at your feet...' }
            }
        },
        'Hallway': { 
            description: 'Success! They key worked! You enter a room on the top floor of the house.  In front of you are three unmarked doors next to eachother.',
            choices: {
                '1': { description: 'Go back downstairs.', success: 'Entry' },
                '2': { description: 'Enter the door on the left.', death: 'You open the door, something something dead end and you lose.' },
                '3': { description: 'Enter the door in the middle.', success: 'Middle' },
                '4': { description: 'Enter the door on the right.', success: 'Right' }
            }
        },
        'Middle': { 
            description: 'You open the door in the middle.  You cannot see anything inside.',
            choices: {
                '1': { description: 'Turn back.', success: 'Hallway' },
                '2': { description: 'Rush in blindly.', tryItem: 'plate of armor', deathWithoutItem: 'TODO death message.' }
            }
        },
        'Right': { 
            description: 'You open the door on the right.  It appears you have found the armory.',
            choices: {
                '1': { description: 'Go back to the hallway.', success: 'Hallway' },
                '2': { description: 'Grab a sword.', item: 'sword' },
                '3': { description: 'Grab a plate of armor.', item: 'plate of armor' },
                '4': { description: 'Grab a shield', death: 'TODO it was a trap!' } // Too mean?
            }
        },
        'Dog': { 
            description: 'You enter a round room.  There are only three things in this room.  The door you came through, a door on the other side of the room, and a two headed dog in the middle.',
            choices: {
                '1': { description: 'Yikes. Go back to the hallway.', success: 'Hallway' },
            }
        },
        'Final1': { 
            description: 'You rip off a piece of the turkey and throw it on the ground.  The dog is distracted for now! You sneak past. You enter a giant room with tall ceilings.  A ray of light shines down from the ceiling in the center of the room. The light shines down upon a jewel encrusted chest.  The chest appears locked, but there is an enscription in an ancient language around the outside of the chest.',
            choices: {
                '1': { description: 'Read the enscription.  It is likely a spell that will unlock the chest.', death: 'The chest explodes? TODO' },
                '2': { description: 'Kick the chest.', success: 'Final2' },
                '3': { description: 'Go back the way you came.', success: 'Dog' }
            }
        },
        'Final2': { 
            description: 'The chest opens.  Inside, all you find is a small piece of parchment.  You unfold the parchment.  It reads SUPER_COOL_CODEWORD.  Enter it into ClueKeeper to defuse the bomb and move on in your hunt.',
            choices: { }
        },
    }
};