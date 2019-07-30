#!/usr/bin/env node
const request = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const Moc = require('../lawmaker/moc-model');

const propublicaAPI = process.env.PROPUBLICA;
const newUrl = 'https://api.propublica.org/congress/v1/members/new.json';
const wholeHouse = 'https://api.propublica.org/congress/v1/116/house/members.json';

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
                console.log(e.message);
                return Promise.reject();
            }
        });
}

function updateDatabaseWithNewMembers(newPropublicaMembers) {
    newPropublicaMembers.forEach(function (new_propub_member) {
        // check against propublica specific member search using id
        getSpecificMember(new_propub_member.api_uri)
            .then(function (fullPropPublicaMember) {
                fullPropPublicaMember.chamber = new_propub_member.chamber === 'House' ? 'lower' : 'upper';
                let newMember = new Moc(fullPropPublicaMember);
                let collection = newMember.chamber === 'lower' ? 'house_reps' : 'senators';
                let officePeopleRef = firebasedb.firestore.collection(collection);
                let queryRef = officePeopleRef.where('id', '==', fullPropPublicaMember.member_id);
                queryRef.get().then(function (querySnapshot) {
                    if (querySnapshot.empty) {
                        console.log('creating new', fullPropPublicaMember.govtrack_id)
                        return newMember.createNew(fullPropPublicaMember).then(Moc.makeNewEndpoints)
                    }
                    // return newMember.update(collection)
                    }).catch(function(error){
                        console.log(error)
                      let errorEmail = new ErrorReport(newMember.govtrack_id + ':' + error, 'Could not find propublica member');
                    //   errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
                    })
            })
            .catch(function (error) {
                // let errorEmail = new ErrorReport(new_propub_member.id + ':' + error, 'Could not update existing moc');
                // errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
                console.log(error)
            });
    });
}

// call propublica 'new members' api endpoint
getNewMembers()
    .then(function (newMembers) {
        console.log('got all new members', newMembers);
        updateDatabaseWithNewMembers(newMembers);
    })
    .catch(function (error) {
        console.log('Uh oh, something went wrong getting new members ', error.message);
    });
