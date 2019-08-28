const firebase = require('../lib/setupFirebase.js');
const Office = require('./office');
const getStateNameFromAbr = require('../lib/get-state-abr-and-name').getStateNameFromAbr;

class StateLawmaker {
    constructor(id, displayName, state, in_office) {
        this.id = id;
        this.displayName = displayName;
        this.state = state;
        this.in_office = in_office || true;
    };

    checkDatabaseShortInfo() {
        // Returns the object found in the case that the person was found
        // Returns false if no person was found
        // The object data is required rather than just `true` because we need to know whether
        // to update existing data or create entirely new data
        let stateLegRef = firebase.firestore.collection(`${this.state}_state_legislature`)
        let queryRef = stateLegRef.doc(this.id)

        return queryRef.get().then(function (querySnapshot) {
            // If document exists, simply return the data
            if (querySnapshot.exists) {
                return querySnapshot.data();
            }

            // We haven't returned yet indicating the document did not exist
            // Query by displayName
            let queryRef = stateLegRef.where('displayName', '==', this.displayName)
            return queryRef.get().then(function (querySnapshot) {
                // If query was not empty, return the first of found documents
                if (!querySnapshot.empty) {
                    const foundMembers = [];
                    querySnapshot.forEach(doc => foundMembers.push(doc.data()));

                    // Double check and return if there is only one document (one found member)
                    if (foundMembers.length == 1) {
                        return foundMembers[0];
                    }

                    // Catch-all / multiple members with same name error
                    return Promise.reject(
                        `Multiple members found with same name: ${this.displayName}`
                    );
                }

                // We haven't returned, nothing was found by id or by display name, return false
                return false;
            }).catch(function(error) {
                console.log(error);
                let errorEmail = new ErrorReport(
                    `${this.displayName}; id: ${this.id}, error: ${error}`, 'Could not find open states member'
                );
                // errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
            });
        }).catch(function(error) {
            console.log(error);
            let errorEmail = new ErrorReport(
                `${this.displayName}; id: ${this.id}, error: ${error}`, 'Could not find open states member'
            );
            // errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
        });
    };

    unpackOpenStatesLawmaker(person) {
        // These are easy to unpack
        this.openStatesDisplayName = person.openStatesDisplayName;
    };

    checkIfCurrentRolesMatch(person) {
        if (this.roles) {
            return this.roles[this.current_office_index] == person.roles[person.current_office_index];
        };

        return false;
    };

    mergeExistingOpenStatesData(existingData, openStatesData) {
        // Handle basic merge
        // We can't just use an object merge / expansion here because role information may get messy and the
        // id for the office person would get overwritten
        this.displayName = existingData.displayName;
        this.in_office = existingData.in_office;
        this.state = existingData.state;

        // Handle role update or not
        if (!StateLawmaker.checkIfCurrentRolesMatch(existingData)) {
            // Current role does not match, add the open states role to the array of already stored roles
            this.roles.push(new Office(this.id, this.state, openStatesData.chamber, 'state', 'won', openStatesData));
        };
    };

    createRoleFromOpenStates(data) {
        const role = new Office(this.id, this.state, data.chamber, 'state', 'won', data);
        this.current_office_index = 0;
        this.roles = [role];
    };

    updateBasicInfo(collection) {
        console.log(this);
        const ref = firebase.firestore.collection('office_people').doc(this.id);
        ref.update(this);
    };

    updateRoles(collection) {

    };

    createNewStateLawMaker(){
        let updates = firebase.firestore.batch();

        const memberIDObject = {
            id: this.id,
            displayName: this.displayName,
            in_office: this.in_office
        };

        const personDataRef = firebase.firestore.collection('office_people').doc(this.id);
        updates.set(personDataRef, JSON.parse(JSON.stringify(this)));
        const collection = `${this.state}_state_legislature`;
        const collectionRef = firebase.firestore.collection(collection).doc(this.id);
        updates.set(collectionRef, memberIDObject);
        console.log(this, memberIDObject);
        return updates.commit().then(function () {
            console.log('successfully added')
        }).catch(console.log);
    };
};

module.exports = StateLawmaker;
