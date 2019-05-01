#!/usr/bin/env node
const request = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const Moc = require('../lawmaker/moc-model');

const propublicaAPI = process.env.PROPUBLICA;
const newUrl = 'https://api.propublica.org/congress/v1/members/new.json';

function getNewMembers() {
    return request
        .get(newUrl)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                return data.results[0].members;
            } catch (e) {
                console.log(e);
            }
        });
}

function getSpecificMember(url) {
    return request
        .get(url)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                return data.results[0];
            } catch (e) {
                console.log(e);
            }
        });
}

function updateDatabaseWithNewMembers(newPropublicaMembers) {
    newPropublicaMembers.forEach(function (new_propub_member) {
        let type;
        if (new_propub_member.chamber == 'House') {
            type = 'rep';
        } else {
            type = 'sen';
        }
        // check against propublica specific member search using id
        getSpecificMember(new_propub_member.api_uri)
            .then(function (fullPropPublicaMember) {
                if (!fullPropPublicaMember.govtrack_id) {
                    const mapping = {
                        H001079: 412743,
                        L000588: 412744,
                        L000589: 412745,
                        B001306: 412747,
                    }
                    fullPropPublicaMember.govtrack_id = mapping[fullPropPublicaMember.member_id] || null;
                    if (!fullPropPublicaMember.govtrack_id) {
                        return console.log('no govtrack_id', newMember.first_name, fullPropPublicaMember.last_name, fullPropPublicaMember.member_id)
                    }
                }
                let newMember = new Moc(fullPropPublicaMember);
                newMember.type = type;
                let path = '/mocData/' + newMember.govtrack_id;
                firebasedb.ref(path).once('value').then(function (snapshot) {
                    if (!snapshot.exists()) {
                        console.log('creating new', fullPropPublicaMember.govtrack_id)
                        return newMember.createNew(fullPropPublicaMember).then(Moc.makeNewEndpoints)

                    }
                    return newMember.update(path)
                    }).catch(function(error){
                      let errorEmail = new ErrorReport(newMember.govtrack_id + ':' + error, 'Could not find propublica member');
                      errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
                    });
            })
            .catch(function (error) {
                let errorEmail = new ErrorReport(new_propub_member.id + ':' + error, 'Could not update existing moc');
                errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
            });
    });
}

// call propublica 'new members' api endpoint
getNewMembers()
    .then(function (newMembers) {
        console.log('got all new members');
        updateDatabaseWithNewMembers(newMembers);
    })
    .catch(function (error) {
        console.log('Uh oh, something went wrong getting new members ', error);
    });
