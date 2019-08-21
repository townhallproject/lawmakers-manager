const firebase = require('../setupFirebase');
const checkIsInDb = require('../check-is-in-db');

const PRESENT_MEMBER_BY_ID = {
    'openStatesDisplayName': 'Vince Leach',
    'state': 'AZ',
    'id': '00f9103d-191e-40ca-8f5c-e5bf806896a6'
}

const PRESENT_MEMBER_BY_NAME = {
    'openStatesDisplayName': 'Vince Leach',
    'state': 'AZ',
    'id': 'FAKE-ID'
}

const NOT_A_PRESENT_MEMEBR = {
    'openStatesDisplayName': 'Bob Boberson',
    'state': 'AZ',
    'id': 'FAKE-ID'
}

const EXPECTED_MEMBER = {
    'display_name': 'Vince Leach',
    'id': '00f9103d-191e-40ca-8f5c-e5bf806896a6',
    'in_office': true
}

describe('check open states member info exists', () => {
    // Acts as if the data was collected and stored by the open states script
    describe('given valid id', () => {
        test('should return a completed object', () => {
            return checkIsInDb.checkOpenStatesMemberInDb(PRESENT_MEMBER_BY_ID).then((actualMember) => {
                expect(actualMember).toEqual(EXPECTED_MEMBER);
            });
        });
    });
    // Acts as if the data was collected and stored by a volunteer
    describe('given valid name but invalid id', () => {
        test('should return object with fake id', () => {
            return checkIsInDb.checkOpenStatesMemberInDb(PRESENT_MEMBER_BY_NAME).then((actualMember) => {
                expect(actualMember).toEqual(EXPECTED_MEMBER);
            });
        });
    });
    // Acts as if the data is not present at all
    describe('given no valid info', () => {
        test('should return fake object', () => {
            return checkIsInDb.checkOpenStatesMemberInDb(NOT_A_PRESENT_MEMEBR).then((data) => {
                expect(data).toEqual(false);
            });
        });
    });
});
