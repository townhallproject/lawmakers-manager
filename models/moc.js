const firebasedb = require('../lib/setupFirebase.js');
const createMemberMetaDataObject = require('../lib/create-metadata-object');
var statesAb = require('../data/stateMap.js');
const Office = require('./office');
const omitBy = require('lodash').omitBy;
const isUndefined = require('lodash').isUndefined;

class Moc {
    static cleanMemberData(data) {
        return omitBy(data, isUndefined)
    }

    static getCurrentRole(id) {
        const personDataRef = firebasedb.firestore.collection('office_people').doc(id);
        return personDataRef.get()
            .then(doc => {
                if (doc.empty) {
                    return Promise.resolve('no person with that id')
                }
                return doc.data();
            })
            .then(person => {
                if (!person) {
                    return Promise.resolve('no person with that id')
                }
                if (!person.roles) {
                    return Promise.resolve('person has no roles')

                }
                return person.roles[person.current_office_index];
            })
    }

    static delete(id) {
        firebasedb.firestore.collection('office_people').doc(id).delete();
        firebasedb.firestore.collection('116th_congress').doc(id);
        return Moc.getCurrentRole(id).then(role => {
            const collection = role.chamber === 'upper' ? 'senators' : 'house_reps';
            firebasedb.firestore.collection(collection).doc(id).delete();
        })

    }

    static updateDisplayName(id, name) {
        console.log("ID", id)
        let updates = firebasedb.firestore.batch();
        const data = {
            displayName: name
        }
        // update the data object
        const personDataRef = firebasedb.firestore.collection('office_people').doc(id);
        updates.update(personDataRef, data);
        return Moc.getCurrentRole(id).then(role => {

            // Add to the lookup tables
            const collection = role.chamber === 'upper' ? 'senators' : 'house_reps';
            const collectionRef = firebasedb.firestore.collection(collection).doc(id);
            updates.update(collectionRef, data);

            const congressCollection = '116th_congress'
            const congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(id);
            updates.update(congressCollectionRef, data);

            return updates.commit().then(function () {
                console.log('successfully updated name', name)
            }).catch(console.log)
        })
    }

    constructor(opts, id) {
        for (let key in opts) {
            if (opts[key]) {
                this[key] = opts[key];
            }
        }
        this.id = opts.propublica_id || opts.member_id;
        this.govtrack_id = opts.govtrack_id || id;
        this.propublica_id = opts.propublica_id || opts.member_id
        this.propublica_facebook = opts.facebook_account;
        if (parseInt(this.propublica_facebook)) {
            this.propublica_facebook = parseInt(this.propublica_facebook);
        }
        if (opts.current_party && opts.current_party.toLowerCase() === 'd') {
            this.party = 'Democratic';
        } else if (opts.current_party && opts.current_party.toLowerCase() === 'r') {
            this.party = 'Republican';
        } else if (opts.current_party) {
            this.party = 'Independent';
        }
        delete this.facebook_account;
    }

    mapRoles() {
        const chamberMapping = {
            House: 'lower',
            Senate: 'upper',
        }
       this.roles = this.roles.map(role => {
           return {
               ...new Office(this.propublica_id, role.state, chamberMapping[role.chamber], 'federal', 'won', role)
           }
       })
    }

    createNew() {
        let updates = firebasedb.firestore.batch();

        this.displayName = this.first_name + ' ' + this.last_name;
        this.end_date = this.roles[0].end_date;
        this.current_office_index = 0; //TODO: decide if we want these to be uids
        const govtrack_id = this.govtrack_id;

        this.mapRoles();

        const memberIDObject = createMemberMetaDataObject({
            id: this.propublica_id,
            govtrack_id: govtrack_id || null,
            displayName: this.displayName,
            in_office: true,
        })

        const moc = Moc.cleanMemberData({...this});
        // Set the data object
        const personDataRef = firebasedb.firestore.collection('office_people').doc(this.propublica_id);
        updates.set(personDataRef, moc);

        // Add to the lookup tables
        const collection = this.roles[0].chamber === 'upper' ? 'senators' : 'house_reps';
        const collectionRef = firebasedb.firestore.collection(collection).doc(this.propublica_id);
        updates.set(collectionRef, memberIDObject);

        const congressCollection = '116th_congress'
        const congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(this.propublica_id);
        updates.set(congressCollectionRef, memberIDObject);

        return updates.commit().then(function () {
            console.log('successfully added', moc.displayName)
        }).catch(console.log)
    };

    update() {
        // Ensure that the end date and current office index are both updated
        this.mapRoles();
        this.end_date = this.roles[0].end_date;
        this.current_office_index = 0; //TODO: decide if we want these to be uids

        // Run update
        const ref = firebasedb.firestore.collection('office_people').doc(this.id);
        ref.update(Moc.cleanMemberData({...this}))
        console.log(`Updated member: ${this.id}`);
    };
}

module.exports = Moc;
