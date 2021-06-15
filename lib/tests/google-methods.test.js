const googleMethods = require('../google-methods');


describe('googleMethods', () => {
    describe('convertColumnToNumber', () => {
        test('it should return a numeral value for a column letter', () => {
            const columnA = 'A';
            const columnC = "C";
            const columnAA = "AA"
            const columnAC = "AC"
            expect(googleMethods.convertColumnToNumber(columnA)).toEqual(1);
            expect(googleMethods.convertColumnToNumber(columnC)).toEqual(3);
            expect(googleMethods.convertColumnToNumber(columnAA)).toEqual(27);
            expect(googleMethods.convertColumnToNumber(columnAC)).toEqual(29);

        });
    });

});
