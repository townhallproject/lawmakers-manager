const StateLawmaker = require('../state-lawmaker');

const PRESENT_MEMBER_BY_ID = new StateLawmaker(
    '00f9103d-191e-40ca-8f5c-e5bf806896a6',
    'Vince Leach',
    'AZ'
);

const PRESENT_MEMBER_BY_NAME = new StateLawmaker(
    'FAKE-ID',
    'Vince Leach',
    'AZ'
)

const NOT_A_PRESENT_MEMEBR = new StateLawmaker(
    'FAKE-ID',
    'Bob Boberson',
    'AZ'
)

const EXPECTED_RESULT_IF_FOUND = {
    'display_name': 'Vince Leach',
    'id': '00f9103d-191e-40ca-8f5c-e5bf806896a6',
    'in_office': true
}

describe('check open states member info exists', () => {
    // Acts as if the data was collected and stored by the open states script
    describe('given valid id', () => {
        test('should return a completed object', () => {
            return PRESENT_MEMBER_BY_ID.checkDatabaseShortInfo().then((actualMember) => {
                expect(actualMember).toEqual(EXPECTED_RESULT_IF_FOUND);
            });
        });
    });
    // Acts as if the data was collected and stored by a volunteer
    describe('given valid name but invalid id', () => {
        test('should return object with fake id', () => {
            return PRESENT_MEMBER_BY_NAME.checkDatabaseShortInfo().then((actualMember) => {
                expect(actualMember).toEqual(EXPECTED_RESULT_IF_FOUND);
            });
        });
    });
    // Acts as if the data is not present at all
    describe('given no valid info', () => {
        test('should return fake object', () => {
            return NOT_A_PRESENT_MEMEBR.checkDatabaseShortInfo().then((data) => {
                expect(data).toEqual(false);
            });
        });
    });
});
