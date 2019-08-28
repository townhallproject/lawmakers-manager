const firebasedb = require('../lib/setupFirebase.js');
const Office = require('./office');
const getStateNameFromAbr = require('../lib/get-state-abr-and-name').getStateNameFromAbr;
class StateLawmaker {
    constructor(id, state, in_office) {
        this.id = id;
        this.state = state;
        this.in_office = in_office;
    };

    unpackOpenStatesLawmaker(person) {
        // These are easy to unpack
        this.displayName = person.displayName || person.openStatesDisplayName;
        this.openStatesDisplayName = person.openStatesDisplayName;
        this.in_office = true;
 
    };

    checkIfRoleExists() {
        
    }

    createRoleFromOpenStates(data) {
        const role = new Office(this.thp_id, this.state, data.chamber, 'state', 'won', data);
        this.current_office_index = 0;
        this.roles = [role];
    };

    updateBasicInfo(collection) {
        console.log(this);
        const ref = firebasedb.firestore.collection('office_people').doc(this.id);
        ref.update(this);
    };

    updateRoles(collection) {

    };

    createNewStateLawMaker(openStatesMember){
        let updates = firebasedb.firestore.batch();

        const memberIDObject = {
            id: this.id,
            display_name: this.displayName,
            in_office: true,
        };

        const personDataRef = firebasedb.firestore.collection('office_people').doc(this.id);
        updates.set(personDataRef, JSON.parse(JSON.stringify(this)));
        const collection = `${openStatesMember.state}_state_legislature`;
        const collectionRef = firebasedb.firestore.collection(collection).doc(this.id);
        updates.set(collectionRef, memberIDObject);
        console.log(this, memberIDObject)
        return updates.commit().then(function () {
            console.log('successfully added')
        }).catch(console.log)
    }
};

module.exports = StateLawmaker;
