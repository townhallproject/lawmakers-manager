require('dotenv').load();

const superagent = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const OpenStatesAPIKey = process.env.OPEN_STATES_API_KEY;
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

const test = `query={
  people {
    edges {
      node {
        name
      }
    }
  }
}`

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

const checkIsInDb = (openStatesMember) => {
  const path = 'state_legislators_data';
  const ref = `${path}/${openStatesMember.state}/${openStatesMember.thp_id}`;
  return firebasedb.realtimedb.ref(ref).once('value')
    .then((snapshot) => {
      return snapshot.exists() ? true : false;
    })
}

const getMemberKey = (name) => {
      let memberKey;
      if (name.split(' ').length === 3) {
        memberKey = name.split(' ')[1].toLowerCase() + name.split(' ')[2].toLowerCase() + '_' + name.split(' ')[0].toLowerCase();
      } else {
        memberKey = name.split(' ')[1].toLowerCase() + '_' + name.split(' ')[0].toLowerCase();
      }
      return memberKey.replace(/\W/g, '');
}

const createNew = (openStatesMember) => {
  let updates = {};

  const memberKey = getMemberKey(openStatesMember.displayName);
  const memberIDObject = {
    id: openStatesMember.thp_id,
    nameEntered: openStatesMember.displayName,
  };
  const dataPath = 'state_legislators_data';
  const idPath = 'state_legislators_id';
  const dataRef = `${dataPath}/${openStatesMember.state}/${openStatesMember.thp_id}`;

  updates[dataRef] = openStatesMember;
  updates[`${idPath}/${openStatesMember.state}/${memberKey}`] = memberIDObject;
  return firebasedb.realtimedb.ref().update(updates)
      .catch(console.log)
}

const update = (member) => {
  const dataPath = 'state_legislators_data';
  const dataRef = `${dataPath}/${member.state}/${member.thp_id}`;
  return firebasedb.realtimedb.ref(dataRef).update(member)
    .catch(console.log)

}

// Iterate through the state names and pull the data from Open States graph ql API
// UPDATE THE OPEN STATES API KEY
Object.keys(stateCodes).forEach(stateName => {
    superagent
        .post('https://openstates.org/graphql')
        .set('X-API-Key', OpenStatesAPIKey)
        .send(generateQueryString(stateName))
        .then((data) => {
            return transformOpenStatesData(data.body);
        })
        .then((lawmakers) => {
          Object.keys(lawmakers).forEach(memberId => {
            const member = lawmakers[memberId];
            member.thp_id = memberId;
            checkIsInDb(member)
              .then((isInDatabase) => {
                if (isInDatabase) {
                    update(member);
                  } else {
                    console.log('creating new', member.openStatesDisplayName)
                    member.displayName = member.openStatesDisplayName;
                    createNew(member);
                  }
                })
          })
        })
        .catch(console.error);
});
