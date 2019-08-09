const Committee = require('./committee');
const stateNameLookup = require('../data/stateMap');
class Office {
    constructor(id, state, stateName, chamber) {
        this.thp_id = id;
        this.state = state;
        this.stateName = stateNameLookup[state];
        this.chamber = chamber;
    };

    unpackOpenStatesRole(data) {
        // Unpack organizations into committees and current party
        this.committees = []
        data.organizations.forEach((org) => {
            if (org.classification.toLowerCase() == 'committee') {
                this.committees.push(Committee(org.name));
            } else if (org.classification.toLowerCase() == 'party') {
                this.party = org.name;
            };
        });

        // Unpack contact info
        data.contactDetails.forEach((contactMethod) => {
            if (contactMethod.voice) {
                this.phone = contactMethod.value;
            } else if (contactMethod.address) {
                this.address = contactMethod.value;
            } else if (contactMethod.email) {
                this.email = contactMethod.email;
            };
        });
    };

};

module.exports = Office;
