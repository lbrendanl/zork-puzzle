/* Unit tests for tc-text-adventure
 *
 */

// Import dependencies
var assert = require('assert');
var TC = require('../frobozz.js');

describe('Text Adventure Unit Tests', function() {
    beforeEach(function() {
        TC.terminal.input = {
            value: ''
        };

        TC.terminal.history = {
            innerHTML: ''
        };

        TC.player.init();

        TC.game.config = {
            startRoom: 'test',
            messages: {
                instructions: 'test instructions',
                inputNotUnderstood: 'test in not understood',
                noAction: 'test nothing'
            },
            rooms: {
                'test': {
                    description: 'Testing...',
                    roomEvents: [
                        {
                            type: 'look',
                            msg: ''
                        }, {
                            type: 'enter',
                            msg: 'you go in',
                            keywords: ['left'],
                            param: 'nextRoom'
                        }, {
                            type: 'take',
                            msg: 'you add the knife to your inventory',
                            keywords: ['knife'],
                            param: 'knife'
                        }
                    ]
                }
            }
        };

        TC.game.currentRoom = TC.game.getRoomByName('test');

    });

    it('terminal should set history innerHTML value', function() {
        TC.terminal.write('Some input');
        assert.equal(TC.terminal.history.innerHTML, 'Some input<br />');
    });

    it('terminal clearHistory should clear innerHTML value', function() {
        TC.terminal.history.innerHTML = 'Some input';
        TC.terminal.clearHistory();
        assert.equal(TC.terminal.history.innerHTML, '');
    });

    it('terminal getInput should get input value', function() {
        TC.terminal.input.value = 'Some input';
        assert.equal(TC.terminal.getInput(), 'Some input');
    });

    it('terminal parse and tokenize input should return array of input', function() {
        assert.deepEqual(TC.terminal.parseAndTokenizeInput(' SoMe iNpuT '), ['some', 'input']);
    });

    it('terminal clearInput should clear input value', function() {
        TC.terminal.input.value = 'Some input';
        TC.terminal.clearInput();
        assert.equal(TC.terminal.input.value, '');
    });

    it('game getRoomByName should get room from config', function() {
        assert.equal(TC.game.getRoomByName('test'), TC.game.config.rooms.test);
    });

    it('game mapTokensToEvent should return matching event type if it exists', function() {
        assert.deepEqual(TC.game.mapTokensToEvents(['attack']), ['attack']);
    });

    it('game mapTokensToEvent should return empty string if event type does not exist', function() {
        assert.deepEqual(TC.game.mapTokensToEvents(['blah']), []);
    });

    it('game getRoomEvent if one mapped event and one room event, and both match, return room event', function() {
        var evt = TC.game.getRoomEvent(['take'], [ { type: 'take', param: 'knife' } ], ['take']);
        assert.equal('take', evt.type);
        assert.equal('knife', evt.param);
    });

    it('game getRoomEvent if one mapped event and multiple room events, check tokens against keywords for match, return action', function() {
        var evt = TC.game.getRoomEvent(['take'],
                [ { type: 'take', keywords: ['knife'], param: 'knife' }, { type: 'take', keywords: ['sword'], param: 'sword' } ],
                ['take', 'sword']
        );
        assert.equal('take', evt.type);
        assert.equal('sword', evt.param);
    });

    it('game getRoomEvent if no events, return invalid action', function() {
        var evt = TC.game.getRoomEvent([], [ { type: 'take', param: 'sword', keywords: ['test'] }, { type: 'enter', keywords: ['bar'] } ], ['blah']);
        assert.equal('invalid', evt.type);
        assert.equal('', evt.param);
    });

    it('player inventory gets updated when items are picked up', function() {
        TC.player.addToInventory('knife');
        assert.deepEqual(TC.player.inventory, ['knife']);
    });
});

/*
 * if no events, not valid
 * if one event and not in room events, not valid
 * ~~if one event only and it matches one roomEvent, do it
 * ~~if one event and matches multiple room events, compare tokens to keywords of matching events
 * if multiple events but same type, and match one room event, do it
 * if multiple events match multiple event types, compare tokens to keywords
 *      if tokens match one keyword, do it
 *      if tokens match multiple keywords, not valid
 */
