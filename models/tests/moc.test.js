const firebasedb = require('../../lib/setupFirebase.js');
const mocData = require('./mock-moc');
const Moc = require('../moc');

const testMoc = new Moc(mocData)

describe('moc', () => {
    beforeAll(() => {
        return testMoc.createNew();
    });
    afterAll(() => {
        return Moc.delete(testMoc.id)
    })
    describe('get current role', () => {
       
        test('it gets the current role of an moc', () => {
            return Moc.getCurrentRole(testMoc.id)
                .then((role) => {
                    expect(role.chamber).toEqual('lower')
                })
        })
        test('it returns a resolved promise if no person with that id', () => {
            return Moc.getCurrentRole("not an id")
                .then((role) => {
                    expect(role).toEqual('no person with that id')
                })
        })

    })

    describe('update displayName', () => {
        test('it changes the displayName in all the lookup tables', () => {
            const newName = "New name"
            return Moc.updateDisplayName(testMoc.id, newName)
                .then(() => {
                    const ref = firebasedb.firestore.collection('house_reps').doc(testMoc.id);
                    return ref.get()
                        .then((snap) => {
                            const updated = snap.data();
                            expect(updated.displayName).toEqual(newName)
                        })
                })
        })
    })
})
