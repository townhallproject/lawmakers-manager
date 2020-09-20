#!/usr/bin/env node
const fs = require('fs')

const request = require('superagent');
const find = require('lodash').find;

const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const Moc = require('../models/moc');
const propublicaAPI = process.env.PROPUBLICA;
const wholeSenate = 'https://api.propublica.org/congress/v1/116/senate/members.json';

function getProPublicaSenate() {
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

function getTHPSenate() {
    let officePeopleRef = firebasedb.firestore.collection('senators');
    let senators = [];
    return officePeopleRef.get()
        .then((snapshot) => {
            snapshot.forEach((senator) => {
                senators.push(senator.id)
            })
            return senators;
        })
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
    newPropublicaMembers.forEach(function (senator) {
                let collection = 'senators';

                let officePeopleRef = firebasedb.firestore.collection('office_people');
                let queryRef = officePeopleRef.where('id', '==', collection.id);

                let newMember = new Moc(fullProPublicaMember);
                queryRef.get().then(function (querySnapshot) {
                    if (querySnapshot.empty) {
                        return newMember.createNew()
                    }
                    let databaseData = {}
                    querySnapshot.forEach((ele) => databaseData = ele.data())
                    return newMember.update(databaseData)
                }).catch(function (error) {
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
    
}

// call propublica 'new members' api endpoint
Promise.all([getTHPSenate(), getProPublicaSenate()])
    .then(function ([thpSenate, propublicaSenate]) {
        console.log(thpSenate.length, propublicaSenate.length)
        thpSenate.forEach((id) => {
            if (!find(propublicaSenate, {id : id})) {
                console.log(id, "not in senate")
            }
        })
    })
    .catch(function (error) {
        console.log('Uh oh, something went wrong getting new members ', error.message);
    });
