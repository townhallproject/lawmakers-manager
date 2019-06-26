#!/usr/bin/env node

const OpenStatesAPIKey = process.env.OPEN_STATES_API_KEY;

const superagent = require('superagent');

function generateQueryString(stateName) {
    return `query={
      jurisdiction(name: "${stateName}") {
        id
        stateName: name
        organizations(first: 3, classification: ["legislature", "lower", "upper"]) {
          edges {
            node {
              id
              name
              chamber: classification
              members: currentMemberships {
                person {
                  id
                    displayName: name
                  contactDetails {
                      type
                    value
                    note
                  }
                  organizations: currentMemberships {
                    organization {
                      name
                      classification
                    }
                  }
                }
                post {
                  label
                  role
                }
              }
            }
          }
        }
      }
  }`
};

function transformOpenStatesData(receivedData) {
    // Entire object of people to be stored
    // Keys are the formatted strings of '${state}-${districtType}-${districtNumber}-${increment}',
    let legislators = {};

    // Organization objects are stored as edges in the received data object
    // For easier parsing later on, create a reference to the edges
    // It will be an array of organization objects
    let organizations = receivedData.data.jurisdiction.organizations.edges;

    // Get state code
    let stateCode = stateCodes[receivedData.data.jurisdiction.stateName];

    // Process each organization
    // Organizations are usually just different levels of bodies
    // Ex: General assembly, Upper, Lower
    organizations.forEach(org => {
        // Make short references
        let chamber = org.node.chamber.toLowerCase();

        // Process each member
        org.node.members.forEach(person => {
            // Match district type short code
            let chamberName = org.node.name.toLowerCase();
            let districtShortType = '';
            if (chamberName.includes('senate')) {
                districtShortType = 'SD';
            } else if (chamberName.includes('house')) {
                districtShortType = 'HD';
            } else if (chamberName.includes('assembly')) {
                districtShortType = 'AD';
            } else {
                districtShortType = 'LD';
            };

            // Find party membership and flatten organization list
            let party = '';
            let organizations = [];
            person.person.organizations.forEach(memberOf => {
                organizations.push(memberOf.organization)
                if (memberOf.organization.classification.toLowerCase() === 'party') {
                    party = memberOf.organization.name;
                };
            });

            // Construct the member for storage in thp
            let toAddMember = {
                'chamber': chamber,
                'openStatesDisplayName': person.person.displayName,
                'district': `${districtShortType}-${person.post.label}`,
                'in_office': true,
                'level': 'state',
                'party': party,
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

            // Construct the thp lookup key
            let id = person.person.id.replace('ocd-person/', '');

            // Attach member to legislators map
            legislators[id] = toAddMember;
        });

    });

    return legislators;
};

// Add states we want to query for to the map
const stateCodes = {
  'Arizona': 'AZ',
  'Colorado': 'CO',
  'Florida': 'FL',
  'Maryland': 'MD',
  'Michigan': 'MI',
  'Maine': 'ME',
  'Nevada': 'NV',
  'North Carolina': 'NC',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Virginia': 'VA',
};

// Iterate through the state names and pull the data from Open States graph ql API
// UPDATE THE OPEN STATES API KEY
Object.keys(stateCodes).forEach(stateName => {
    superagent
        .post('https://openstates.org/graphql')
        .set('X-API-Key', OpenStatesAPIKey)
        .send(generateQueryString('Nevada'))
        .then((data) => {
            return transformOpenStatesData(data.body);
        })
        .then(console.log)
        .catch(console.error);
});
