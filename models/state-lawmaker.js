const firebasedb = require('../lib/setupFirebase.js');
var statesAb = require('../data/stateMap.js');

class StateLawmaker {
    constructor(id, displayName, state, chamber) {
        this.thp_id = id;
        this.displayName = displayName;
        this.state = state;
        this.current_chamber = chamber;
    };

    unpackOpenStatesLawmaker(data) {
        // These are easy to unpack
        this.displayName = data.person.displayName;
        this.openStatesDisplayName = data.person.displayName;
        this.in_office = true;
        this.level = 'state';

        // Construct the member for storage in thp
        let toAddMember = {
            'state': stateCode,
            'stateName': receivedData.data.jurisdiction.stateName,
            'organizations': organizations
        };

        // Flatten the contact info
        // In the future if you want to track multiple addresses or phone numbers for a legislator
        // you will need to come up with a mapping where the contact note is taken into consideration
        person.person.contactDetails.forEach(contactDetail => {
            toAddMember[contactDetail.type] = contactDetail.value;
        });

        // These things require formatting
        let districtShortType = '';
        // Senate district
        if (this.chamber.includes('senate')) {
            districtShortType = 'SD';
        // House district
        } else if (this.chamber.includes('house')) {
            districtShortType = 'HD';
        // Assembly district
        } else if (this.chamber.includes('assembly')) {
            districtShortType = 'AD';
        // Default to: Legislative district
        } else {
            districtShortType = 'LD';
        };
        // Set district with the district short type
        this.district = `${districtShortType}-${data.post.label}`;

        // Find party membership and flatten organization list
        this.organizations = [];
        person.person.organizations.forEach(memberOf => {
            organizations.push(memberOf.organization);
            if (memberOf.organization.classification.toLowerCase() === 'party') {
                this.current_party = memberOf.organization.name;
            };
        });
    };

    createRoleFromOpenStates(data) {

    };

    updateBasicInfo(collection) {
        console.log(this);
        const ref = firebasedb.firestore.collection('office_people').doc(this.id);
        ref.update(this);
    };

    updateRoles(collection) {

    };
};

module.exports = StateLawmaker;
