const StateLawmaker = require('../state-lawmaker');

const PRESENT_MEMBER_BY_ID = new StateLawmaker(
    '00f9103d-191e-40ca-8f5c-e5bf806896a6',
    'Vince Leach',
    'AZ'
);

const NEW_MEMBER_BY_NAME = new StateLawmaker(
    'actual-id',
    'Entered By Volunteer',
    'AZ'
)

const PRESENT_MEMBER_BY_NAME = new StateLawmaker(
    'temp-id',
    'Entered By Volunteer',
    'AZ'
)

const NOT_A_PRESENT_MEMBER = new StateLawmaker(
    'FAKE-ID',
    'Bob Boberson',
    'AZ'
)

const EXPECTED_RESULT_IF_FOUND = {
    'displayName': 'Vince Leach',
    'id': '00f9103d-191e-40ca-8f5c-e5bf806896a6',
    'in_office': true
}

const EXPECTED_TEMP_INFO = {
    'displayName': 'Entered By Volunteer',
    'id': 'temp-id',
    'in_office': true
}

describe('open states module', () => {
    beforeAll(() => {
        PRESENT_MEMBER_BY_ID.createNewStateLawMaker();
        PRESENT_MEMBER_BY_NAME.createNewStateLawMaker();
        
    });
    afterAll(() => {
        PRESENT_MEMBER_BY_ID.deleteExistingOutOfDateStateLawmakerById("temp-id");
        PRESENT_MEMBER_BY_NAME.deleteExistingOutOfDateStateLawmakerById("00f9103d-191e-40ca-8f5c-e5bf806896a6");
    })
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
            test('should return object with temp id', () => {
                return NEW_MEMBER_BY_NAME.checkDatabaseShortInfo().then((actualMember) => {
                    expect(actualMember).toEqual(EXPECTED_TEMP_INFO);
                });
            });
        });
        // Acts as if the data is not present at all
        describe('given no valid info', () => {
            test('should return fake object', () => {
                return NOT_A_PRESENT_MEMBER.checkDatabaseShortInfo().then((data) => {
                    expect(data).toEqual(false);
                });
            });
        });
    });
})
