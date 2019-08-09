require('dotenv').load();

const superagent = require('superagent');
const firebase = require('../lib/setupFirebase.js');
const getStates = require('../lib/get-states');

const OpenStatesAPIKey = process.env.OPEN_STATES_API_KEY;

function generateOpenStatesQueryString(stateName) {
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

function transformOpenStatesLegislatorsData(receivedData) {
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

const checkIsInDb = (openStatesMember) => {
    const path = 'state_legislators_data';
    const ref = `${path}/${openStatesMember.state}/${openStatesMember.thp_id}`;
    let stateLegRef = firebase.firestore.collection(`${openStatesMember.state}_state_legislature`)
    console.log(`storing next stage lawmaker in collection: ${openStatesMember.state}`);
    let queryRef = stateLegRef.where('id', '==', openStatesMember.thp_id)
    // return queryRef.once('value')
    // .then((snapshot) => {
    //   return snapshot.exists();
    // })
    queryRef.get().then(function (querySnapshot) {
        if (querySnapshot.empty) {
            console.log('creating new', openStatesMember.thp_id)
            // return newMember.createNew(fullProPublicaMember).then(Moc.makeNewEndpoints)
        }
        // return newMember.update(collection)
        }).catch(function(error){
            console.log(error)
          let errorEmail = new ErrorReport(newMember.govtrack_id + ':' + error, 'Could not find propublica member');
        //   errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
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
  return firebase.realtimedb.ref().update(updates)
      .catch(console.log)
}

const update = (member) => {
  const dataPath = 'state_legislators_data';
  const dataRef = `${dataPath}/${member.state}/${member.thp_id}`;
  return firebase.realtimedb.ref(dataRef).update(member)
    .catch(console.log)
}

async function getStateLegs() {
  stateCodes = await getStates().catch((err) => {
    console.log(err);
  });
  // Iterate through the state names and pull the data from Open States GraphQL API
  Object.keys(stateCodes).forEach(stateName => {
    superagent
      .post('https://openstates.org/graphql')
      .set('X-API-Key', OpenStatesAPIKey)
      .send(generateOpenStatesQueryString(stateName))
      .then((data) => {
        return transformOpenStatesLegislatorsData(data.body);
      })
      .then((lawmakers) => {
        Object.keys(lawmakers).forEach(memberId => {
          const member = lawmakers[memberId];
          member.thp_id = memberId;
          checkIsInDb(member)
            .then((isInDatabase) => {
              if (isInDatabase) {
                console.log('already there, updating', member.thp_id)
                update(member);
              } else {
                member.displayName = member.openStatesDisplayName;
                console.log('creating new', member.displayName)
                createNew(member);
              }
            })
        })
      })
      .catch((error) => console.error('error getting lawmakers from openstates', error));
  });
}

getStateLegs();
