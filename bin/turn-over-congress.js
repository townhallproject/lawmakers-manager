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
            .then(async function (fullProPublicaMember) {
                
                let officePeopleRef = firebasedb.firestore.collection('office_people');
                let queryByName = officePeopleRef.where("displayName", "==", `${fullProPublicaMember.first_name} ${fullProPublicaMember.last_name}`)
                let queryRef = officePeopleRef.where('id', '==', fullProPublicaMember.member_id);

                let newMember = new Moc(fullProPublicaMember);
                const sameNameSnapshot = await queryByName.get();
                const sameIdSnapShot = await queryRef.get();
                if (!sameNameSnapshot.empty && !sameIdSnapShot.empty) {

                    const sameNames = {};
                    let sameIdData = {};
                    sameNameSnapshot.forEach((ele) => {
                        sameNames[ele.id] = ele.data()
                    })
                    sameIdSnapShot.forEach((ele) => {
                        sameIdData = ele.data()
                    })
                    newMember.addToCongress(sameIdData.displayName);

                    if (Object.keys(sameNames).length === 1 && sameNames[fullProPublicaMember.member_id]) {
                        return newMember.update(sameIdData)

                    } else if (Object.keys(sameNames).length > 1) {
                        Object.keys(sameNames).forEach((otherId) => {
                            if (otherId !== fullProPublicaMember.member_id) {
                                console.log('need to merge id', otherId, fullProPublicaMember.member_id)
                                newMember.merge(otherId)
                            }
                        })

                    }
                } else if (!sameNameSnapshot.empty && sameIdSnapShot.empty) {
                    await newMember.createNew()
                    newMember.addToCongress();

                    sameNameSnapshot.forEach((otherSnap) => {

                        console.log('need to update id', otherSnap.id, fullProPublicaMember.member_id)
                        newMember.merge(otherSnap.id)
                    })
                } else {
                    console.log('need to make a new one', fullProPublicaMember.member_id)

                    return newMember.createNew()
                }
          
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
