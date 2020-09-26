require('dotenv').config();

const superagent = require('superagent');
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
            if (!person.person) {
              console.log(person)
              return;
            }
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

async function getStateLegs() {
  stateCodes = await getStates().catch((err) => {
    console.log('err getting state legs list', err.message);
    process.exit(1);
  });
  // Iterate through the state names and pull the data from Open States GraphQL API
  Object.keys(stateCodes).forEach(async stateName => {
    try {
      const data = await superagent
        .post('https://openstates.org/graphql')
        .set('X-API-Key', OpenStatesAPIKey)
        .send(generateOpenStatesQueryString(stateName));
      if (!data) {
        console.log('no data returned from open states')
        return process.exit(1);
      }
      const lawmakers = transformOpenStatesLegislatorsData(data.body);
      Object.keys(lawmakers).forEach(memberId => {
        const person = lawmakers[memberId];
        const newOfficePerson = new StateLawmaker(memberId, person.openStatesDisplayName, person.state, person.party);
        // Unpack open states data
        newOfficePerson.unpackOpenStatesLawmaker(person);
        // Handle person unpacking and storage based off if member already exists in database
        newOfficePerson.checkDatabaseShortInfo()
          .then((checkResult) => {
            // If an object was returned, we either need to do to nothing, or update the existing data
            if (checkResult) {
              // Check the id of the person found matches the open states id
              if (newOfficePerson.id == checkResult.id) {
                // Great, don't do anything, this data is already correct
                // console.log(`office person: ${newOfficePerson.id} already exists`);
                return newOfficePerson.updateBasicInfo();
              };

              // This member was added to the database prior to open states adding them
              // Get their full data, merge the already stored data with the open states data, and then update
              // the database with their official id and propagate changes back to the state legislature lookup
              console.log(`office person found by name; oldId: ${checkResult.id}, newId: ${newOfficePerson.id}`);

              // Get full office person data
              let existingData = newOfficePerson.checkForExistingStateLawmakerById(checkResult.id);
              if (existingData) {
                // Handle merge
                newOfficePerson.mergeExistingOpenStatesData(doc.data(), person);

                // Create entirely new office person
                // This also updates the state legislator lookup table
                newOfficePerson.createNewStateLawMaker();

                // Delete old office people document and the state legislator doc
                newOfficePerson.deleteExistingOutOfDateStateLawmakerById(id);

                return newOfficePerson.id;
              };
            };

            // The checkResult value must have been `false`
            // In this case, make an entirely new member
            console.log(`creating new member: ${newOfficePerson.id}`);
            newOfficePerson.createRoleFromOpenStates(person);
            newOfficePerson.createNewStateLawMaker();

            return newOfficePerson.id;
          }).catch(err => {
            console.log(
              `error unpacking data; name: ${newOfficePerson.displayName}, id: ${newOfficePerson.id}, error: ${err}`);
          });
      });
    } catch (error) {
      console.error('error getting lawmakers from openstates', error);
      process.exit(1);
    }
  });
};

getStateLegs();
