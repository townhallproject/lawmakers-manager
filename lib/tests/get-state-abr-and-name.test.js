const stateNameModule = require('../get-state-abr-and-name');


describe('get state abr and name', () => {
    describe('getStateNameFromAbr', () => {
        test('it should return state name for a state', () => {
            let testState = 'CA';
            expect(stateNameModule.getStateNameFromAbr(testState)).toEqual('California');

            });
    });
    describe('getStateAbrFromName', () => {
        test('it should return state abr for a state name', () => {
            let testState = 'California';
            expect(stateNameModule.getStateAbrFromName(testState)).toEqual('CA');

        });
    });
});
