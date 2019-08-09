const Committee = require('./committee');
const getStateNameFromAbr = require('../lib/get-state-abr-and-name').getStateNameFromAbr;
class Office {
    constructor(id, state, chamber, level, status, opts) {
        this.id = id;
        this.state = state;
        this.stateName = getStateNameFromAbr(state);
        this.chamber = chamber;
        this.level = level;
        this.status = status; // won, lost, primary, general
        // optional fields (from propublica)
        this.congress = opts.congress || null;
        this.title = opts.title || null;
        this.short_title = opts.short_title || null;
        this.leadership_role = opts.leadership_role || null;
        this.fec_candidate_id = opts.fec_candidate_id || null;
        this.seniority = opts.seniority || null;
        this.district = opts.district || null;
        this.at_large = opts.at_large || false;
        this.ocd_id = opts.ocd_id || null;
        this.start_date = opts.start_date || null;
        this.end_date = opts.end_date || null;
        this.address = opts.office || null;
        this.phone = opts.phone || null;
        this.fax = opts.fax || null;
        this.contact_form = opts.contact_form || null;
        this.bills_sponsored = opts.bills_sponsored || null;
        this.bills_cosponsored = opts.bills_cosponsored || null;
        this.missed_votes_pct = opts.missed_votes_pct || null;
        this.votes_with_party_pct = opts.votes_with_party_pct || null;
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
