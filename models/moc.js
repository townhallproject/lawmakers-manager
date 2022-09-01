const uniq = require('lodash').uniq;

const firebasedb = require('../lib/setupFirebase.js')
const createMemberMetaDataObject = require('../lib/create-metadata-object')
const statesAb = require('../data/stateMap.js')
const Office = require('./office')
const {
    isEmpty
} = require('lodash')
const omitBy = require('lodash').omitBy
const isUndefined = require('lodash').isUndefined

class Moc {
    static cleanMemberData(data) {
        return omitBy(data, isUndefined)
    }

    static getCurrentRole(id) {
        const personDataRef = firebasedb.firestore.collection('office_people').doc(id)
        return personDataRef.get()
            .then(doc => {
                if (doc.empty) {
                    return Promise.resolve('no person with that id')
                }
                return doc.data()
            })
            .then(person => {
                if (!person) {
                    return Promise.resolve('no person with that id')
                }
                if (!person.roles) {
                    return Promise.resolve('person has no roles')
                }
                return person.roles[person.current_office_index]
            })
    }

    static delete(id) {
        firebasedb.firestore.collection('office_people').doc(id).delete()
        firebasedb.firestore.collection('116th_congress').doc(id)
        return Moc.getCurrentRole(id).then(role => {
            const collection = role.chamber === 'upper' ? 'senators' : 'house_reps'
            firebasedb.firestore.collection(collection).doc(id).delete()
        })
    }

    static updateDisplayName(id, name) {
        console.log('ID', id)
        const updates = firebasedb.firestore.batch()
        const data = {
            displayName: name
        }
        // update the data object
        const personDataRef = firebasedb.firestore.collection('office_people').doc(id)
        updates.update(personDataRef, data)
        return Moc.getCurrentRole(id).then(role => {
            // Add to the lookup tables
            const collection = role.chamber === 'upper' ? 'senators' : 'house_reps'
            const collectionRef = firebasedb.firestore.collection(collection).doc(id)
            updates.update(collectionRef, data)

            const congressCollection = '116th_congress'
            const congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(id)
            updates.update(congressCollectionRef, data)

            return updates.commit().then(function () {
                console.log('successfully updated name', name)
            }).catch(console.log)
        })
    }

    constructor(opts, id) {
        for (const key in opts) {
            if (opts[key] != undefined) {
                this[key] = opts[key]
            }
        }
        this.id = opts.propublica_id || opts.member_id
        this.govtrack_id = opts.govtrack_id || id
        this.propublica_id = opts.propublica_id || opts.member_id
        this.propublica_facebook = opts.facebook_account
        if (parseInt(this.propublica_facebook)) {
            this.propublica_facebook = parseInt(this.propublica_facebook)
        }
        if (opts.current_party && opts.current_party.toLowerCase() === 'd') {
            this.party = 'Democratic'
        } else if (opts.current_party && opts.current_party.toLowerCase() === 'r') {
            this.party = 'Republican'
        } else if (opts.current_party) {
            this.party = 'Independent'
        }
        delete this.facebook_account
    }

    mapRoles() {
        const chamberMapping = {
            House: 'lower',
            Senate: 'upper'
        }
        this.roles = this.roles.map(role => {
            return {
                ...new Office(this.propublica_id, role.state, chamberMapping[role.chamber], 'federal', 'won', role)
            }
        })
    }

    makeRole(role) {
        const chamberMapping = {
            House: 'lower',
            Senate: 'upper'
        }
        let chamber;
        if (role.chamber === 'lower' || role.chamber === 'upper') {
            chamber = role.chamber;

        } else {
            chamber = chamberMapping[role.chamber]
        }

        return {
            ...new Office(this.propublica_id, role.state, chamber, 'federal', 'won', role)
        }
    }

    getUpdatedRoles(indexToUpdate, roles, newRoleData) {
        return roles.map((role, index) => {
            if (index === indexToUpdate) {
                return {
                    ...role,
                    ...newRoleData
                }
            } else {
                return role
            }
        })
    }

    addToCongress(displayName) {
        this.mapRoles()
        let name = displayName || this.first_name + ' ' + this.last_name

        const memberIDObject = createMemberMetaDataObject({
            id: this.propublica_id,
            govtrack_id: this.govtrack_id || null,
            displayName: name,
            in_office: this.in_office
        })
        if (this.in_office) {
            const collection = this.roles[0].chamber === 'upper' ? 'senators' : 'house_reps'
            const collectionRef = firebasedb.firestore.collection(collection).doc(this.propublica_id)
            collectionRef.set(memberIDObject)
        }
        if (this.roles[0].congress) {
            const congressCollection = `${this.roles[0].congress}th_congress`
            const congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(this.propublica_id)
            congressCollectionRef.set(memberIDObject)
        }
    }

    createNew() {
        const updates = firebasedb.firestore.batch()

        this.displayName = this.first_name + ' ' + this.last_name
        this.end_date = this.roles[0].end_date
        if (this.in_office) {
            this.current_office_index = 0 // TODO: decide if we want these to be uids
        }
        const govtrack_id = this.govtrack_id

        this.mapRoles()

        const memberIDObject = createMemberMetaDataObject({
            id: this.propublica_id,
            govtrack_id: govtrack_id || null,
            displayName: this.displayName,
            in_office: this.in_office
        })

        const moc = Moc.cleanMemberData({
            ...this
        })
        // Set the data object
        const personDataRef = firebasedb.firestore.collection('office_people').doc(this.propublica_id)
        updates.set(personDataRef, moc)

        // Add to the lookup tables
        if (this.in_office) {
            const collection = this.roles[0].chamber === 'upper' ? 'senators' : 'house_reps'
            const collectionRef = firebasedb.firestore.collection(collection).doc(this.propublica_id)
            updates.set(collectionRef, memberIDObject)
        }
        if (this.roles[0].congress) {
            const congressCollection = `${this.roles[0].congress}th_congress`
            const congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(this.propublica_id)
            updates.set(congressCollectionRef, memberIDObject)
        }

        return updates.commit().then(function () {
            console.log('successfully added', moc.displayName)
        }).catch(console.log)
    };

    async checkDoc(otherId, ref, updates) {
        const otherIdDoc = await ref.doc(otherId).get();
        if (otherIdDoc.exists) {
            const realDoc = await ref.doc(this.id).get();
            if (realDoc.exists) {
                updates.update(ref.doc(this.id), otherIdDoc.data())
            } else {
                updates.set(ref.doc(this.id), otherIdDoc.data())
            }
            updates.delete(ref.doc(otherId))
        }
    }

    async merge(otherId) {
        const doc = await firebasedb.firestore.collection('office_people').doc(this.id).get()
        if (!doc.exists) {
            console.log('no original doc to merge')
            return;
        }
        const updates = firebasedb.firestore.batch()
        const archivedEvents = await firebasedb.firestore.collection('archived_town_halls')
            .where('officePersonId', '==', otherId)
            .get()
        await this.checkDoc(otherId, firebasedb.firestore.collection('senators'), updates)
        await this.checkDoc(otherId, firebasedb.firestore.collection('house_reps'), updates)
        await this.checkDoc(otherId, firebasedb.firestore.collection('federal_candidates'), updates)

        if (!archivedEvents.empty) {
            console.log('events')
        }
        if (doc.data().otherIds) {
            console.log(doc.data().otherIds)
        } else {

            updates.update(firebasedb.firestore.collection('office_people').doc(this.id), {
                otherIds: [otherId]
            })
          
        }
        updates.delete(firebasedb.firestore.collection('office_people').doc(otherId))
        updates.commit().catch(console.log)
    }

    update(dbEntry) {
        const ref = firebasedb.firestore.collection('office_people').doc(this.id)
        const dataFromPropublica = Moc.cleanMemberData({
            ...this
        })
        const dataInDatabase = dbEntry
        const toAdd = {}

        for (const key in dataFromPropublica) {
            const dbele = dataInDatabase[key]
            const ppele = dataFromPropublica[key]
            if (ppele && dbele !== ppele && key !== 'roles' && key !== 'last_updated') {
                toAdd[key] = ppele
            }
        }
        if (!dataInDatabase.current_office_index && dataInDatabase.current_office_index !== 0) {
            dataInDatabase.current_office_index = 0
            toAdd.current_office_index = 0
        }
        const currentRoleFromPropublica = this.makeRole(dataFromPropublica.roles[0])
        const currentRoleFromDB = dataInDatabase.roles ? dataInDatabase.roles[dataInDatabase.current_office_index] : {}
        const newRole = {}
        // make sure both exist and it's the same role/office before we check for changes
        if (currentRoleFromDB && currentRoleFromPropublica &&
            currentRoleFromDB.start_date === currentRoleFromPropublica.start_date) {
            for (const key in currentRoleFromPropublica) {
                const dbele = currentRoleFromDB[key]
                const ppele = currentRoleFromPropublica[key]
                if (ppele && dbele !== ppele) {
                    newRole[key] = ppele
                }
            }
            if (!isEmpty(newRole)) {
                console.log('update role', dataInDatabase.displayName, newRole)
                toAdd.roles = this.getUpdatedRoles(dataInDatabase.current_office_index, dataInDatabase.roles, newRole)
            }
        } else {
            // add new role
            console.log('add new role', dataInDatabase.displayName)
            toAdd.roles = [currentRoleFromPropublica, ...dataFromPropublica.roles]
            
        }
        if (!isEmpty(toAdd)) {
            toAdd.last_updated = {
                by: 'propublica',
                time: this.last_updated
            }
            ref.update(toAdd)
            console.log(`Updated member: ${dataInDatabase.displayName}`)
        }
    };
}

module.exports = Moc