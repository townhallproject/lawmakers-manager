#!/usr/bin/env node
const request = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const Moc = require('../models/moc');

const propublicaAPI = process.env.PROPUBLICA;
const wholeHouse = 'https://api.propublica.org/congress/v1/117/house/members.json';
const wholeSenate = 'https://api.propublica.org/congress/v1/117/senate/members.json';

function getHouse() {
    return request
        .get(wholeHouse)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                return data.results[0].members;
            } catch (e) {
                console.log('error getting house', e);
            }
        });
}

function getSenate() {
    return request
        .get(wholeSenate)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                return data.results[0].members;
            } catch (e) {
                console.log('error getting senate', e);
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
                console.log(`error looking up ${url} ${e.message}`);
                return Promise.reject();
            }
        });
}

function updateDatabaseWithNewMembers(newPropublicaMembers) {
    newPropublicaMembers.forEach(function (new_propub_member) {
        // check against propublica specific member search using id
        getSpecificMember(new_propub_member.api_uri)
            .then(function (fullProPublicaMember) {
                let chamber = fullProPublicaMember.roles[0].chamber === 'House' ? 'lower' : 'upper';
                let collection = chamber === 'lower' ? 'house_reps' : 'senators';
                
                let officePeopleRef = firebasedb.firestore.collection('office_people');
                let queryRef = officePeopleRef.where('id', '==', fullProPublicaMember.member_id);

                let newMember = new Moc(fullProPublicaMember);
                queryRef.get().then(function (querySnapshot) {
                    if (querySnapshot.empty) {
                        console.log('creating new', fullProPublicaMember.govtrack_id)
                        return newMember.createNew()
                    }
                    let databaseData = {}
                    querySnapshot.forEach((ele) => databaseData = ele.data())
                    return newMember.update(databaseData)
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
Promise.all([getHouse(), getSenate()])
    .then(function (newMembers) {
        console.log('got all current members');
        updateDatabaseWithNewMembers([...newMembers[0], ...newMembers[1]]);
    })
    .catch(function (error) {
        console.log('Uh oh, something went wrong getting new members ', error.message);
    });
