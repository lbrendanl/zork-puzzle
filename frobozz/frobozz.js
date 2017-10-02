window.onload = start;

// TODO make this sound nice and rhymey
const intro = [
    'You see an old, decrepit house before you.',
    'The treasure you seek is somewhere inside.',
    'But plenty of traps and obstacles stand in your way.',
    'There is something familiar about this place....'
]

let inventory = [];

let introIndex = 0;
let interval;

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
        this._currentRoomName = this._config.startRoom;
        this.loadRoom(this._currentRoomName);
    },

    loadRoom: function (roomName) {
        var room = this._config.rooms[roomName];

        Terminal.clearHistory();
        Terminal.write(room.description);
        Terminal.write();
        Terminal.write(this._config.messages.instructions);
        Terminal.write();

        for (var choice in room.choices) {
            Terminal.write(choice + ' - ' + room.choices[choice].description);
        }

        Terminal.write();
    },

    processCmd: function (cmd) {
        var room = this._config.rooms[this._currentRoomName];

        for (var choice in room.choices) {
            if (cmd.trim() == choice.trim()) {
                if (room.choices[choice].death) {
                    Terminal.write(room.choices[choice].death);
                    Terminal.write("Game Over......");
                    setTimeout(() => {
                        location.reload();
                    }, 5000);
                    return;
                } else if (room.choices[choice] !== '') {
                    this._currentRoomName = room.choices[choice].success;
                    this.loadRoom(room.choices[choice]);
                    return;
                }

                Terminal.write(this._config.messages.noAction);
                return;
            }
        }

        Terminal.write(this._config.messages.inputNotUnderstood);
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
    startRoom: 'B0',
    messages: {
        instructions: 'What would you like to do?',
        inputNotUnderstood: 'Come again?',
        noAction: 'Nothing to do.'
    },
    rooms: {
        'B0': {
            description: 'You see a large knight standing blocking the entrance to the house.',
            choices: {
                '1': { description: 'Attack him with your sword', death: 'Sorry, you do not have a sword' },
                '2': { description: 'Make an empassioned speach about your destiny.', success: 'B1' }
            }
        },
        'B1': {
            description: 'In the entryway of the house, you see a giant staircase leading both up and down.  There are also doors to your left and right.',
            choices: {
                'Go up the stairs': { death: 'The stairs lead upwards. At the top of the stairs you fall through a trap door' },
                'Go down the stairs': 'B2',
                'Go into the room to the right': { death: 'some reason.' },
                'Go into the room to the left': { death: 'some other reason.' },
            }
        },
        'B2': {
            description: 'At the bottom of the stairs is a small basement room. To your left you can see the kitchen, to your right a closet.',
            choices: {
                'Head into the closet.': { death: 'Sorry, you do not have a sword' },
                'Head into the kitchen.': { success: 'B3' }
            }
        },
        'B3': {
            description: 'You are in the kitchen.  ',
            choices: {
                'Head into the closet.': { death: 'Sorry, you do not have a sword' },
                'Head into the kitchen.': { success: 'B3' }
            }
        },
    }
};