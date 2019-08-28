require('dotenv').load();

const superagent = require('superagent');
const firebase = require('../lib/setupFirebase.js');
const getStates = require('../lib/get-included-state-legs');

const OpenStatesAPIKey = process.env.OPEN_STATES_API_KEY;
const GoogleCivicsAPIKey = process.env.GOOGLE_CIVICS_API_KEY;
const GoogleCivicsBaseURL = 'https://www.googleapis.com/civicinfo/v2/representatives'

function generateGoogleCivicsQueryString(stateCode) {
    stateCode = stateCode.toLowerCase();
    ocdId = `ocd-division%2Fcountry%3Aus%2Fstate%3A${stateCode}`;
    return `${GoogleCivicsBaseURL}/${ocdId}`;
};


function transformGoogleCivicsStateHeadsData(receivedData) {
    // Reference: https://developers.google.com/civic-information/docs/v2/representatives/representativeInfoByDivision

    // Create short references
    // There should only ever be a single state returned from the divisions branch
    // so shorten by choosing first value from the object
    let stateInfo = Object.values(receivedData.divisions)[0];
    let governor = receivedData.officials[0];

    // Construct basic object
    let formatted = {
        'displayName': governor['name'],
        'party': governor['party'].replace(' Party', ''),
        'chamber': 'statewide',
        'in_office': true,
        'role': 'Governor',
        'stateName': stateInfo.name,
        'state': stateCodes[stateInfo.name]
    };

    // Add contact values when available
    if ('phones' in governor) {
        formatted['phone'] = governor.phones[0];
    };
    if ('channels' in governor) {
        governor.channels.forEach(channel => {
            formatted[channel.type.toLowerCase()] = channel.id;
        });
    };
    if ('photoUrl' in governor) {
        formatted['photoUrl'] = governor.photoUrl;
    };

    return formatted;
};

const checkIsInDb = (openStatesMember) => {
  const path = 'state_legislators_data';
  const ref = `${path}/${openStatesMember.state}/${openStatesMember.thp_id}`;
  return firebase.realtimedb.ref(ref).once('value')
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
    display_name: openStatesMember.displayName,
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

async function getGovernors() {
  stateCodes = await getStates().catch((err) => {
    console.log(err);
  });
  console.log(stateCodes)
  // Iterate through the state codes and pull the state head data from the Google Civics API
  Object.values(stateCodes).forEach(stateCode => {
      superagent
          .get(generateGoogleCivicsQueryString(stateCode))
          .set('Accept', 'application/json')
          .query({roles: 'headofGovernment', key: GoogleCivicsAPIKey})
          .then((data) => {
              return transformGoogleCivicsStateHeadsData(data.body)
          })
          .then((data) => {
              console.log(data);
          })
      .catch((error) => console.error('error getting governors from google civics', error.message));
  });

}

getGovernors()

