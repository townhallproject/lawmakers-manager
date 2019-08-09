require('dotenv').load();

const superagent = require('superagent');
const firebase = require('../lib/setupFirebase.js');
const getStates = require('../lib/get-included-state-legs');
const StateLawmaker = require('../models/state-lawmaker');
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
            let id = person.person.id.replace('ocd-person/', '');

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

            // // Construct the thp lookup key

            // Attach member to legislators map
            legislators[id] = toAddMember;
        });

    });

    return legislators;
};

// TODO: check if for other matches. 
// if we've manually entered a person, want to have that return here too. 

const checkIsInDb = (openStatesMember) => {
    let stateLegRef = firebase.firestore.collection(`${openStatesMember.state}_state_legislature`)
    let queryRef = stateLegRef.where('id', '==', openStatesMember.id)

    return queryRef.get().then(function (querySnapshot) {
        return !querySnapshot.empty;
        }).catch(function(error){
            console.log(error)
          let errorEmail = new ErrorReport(newMember.govtrack_id + ':' + error, 'Could not find propublica member');
        //   errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
        })
}

async function getStateLegs() {
  stateCodes = await getStates().catch((err) => {
    console.log('err getting state legs list', err);
  });
  // Iterate through the state names and pull the data from Open States GraphQL API
  Object.keys(stateCodes).forEach(stateName => {
    superagent
      .post('https://openstates.org/graphql')
      .set('X-API-Key', OpenStatesAPIKey)
      .send(generateOpenStatesQueryString(stateName))
      .then((data) => {
        console.log('got data')
        return transformOpenStatesLegislatorsData(data.body);
      })
      .then((lawmakers) => {
        Object.keys(lawmakers).forEach(memberId => {
          const person = lawmakers[memberId]
          const newOfficePerson = new StateLawmaker(memberId, person.state, true)
          person.id = memberId;

          checkIsInDb(person)
            .then((isInDatabase) => {
              if (isInDatabase) {
                console.log('already there, updating', person.id)
                // TODO: check this
                // newOfficePerson.updateBasicInfo();
              } else {
                newOfficePerson.unpackOpenStatesLawmaker(person);
                newOfficePerson.createRoleFromOpenStates(person);
                console.log('creating new', newOfficePerson.displayName)
                newOfficePerson.createNewStateLawMaker(person)
              }
            }).catch(err => {
              console.log('error unpacking', err)
            })
        })
      })
      .catch((error) => console.error('error getting lawmakers from openstates', error));
  });
}

getStateLegs();
