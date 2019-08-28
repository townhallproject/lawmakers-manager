#!/usr/bin/env node

const request = require('superagent');
const moment = require('moment');

const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const  { map, find, filter }  = require('lodash');
const Moc = require('../lawmaker/moc-model');
const propublicaAPI = process.env.PROPUBLICA;

const oldUrl = 'https://api.propublica.org/congress/v1/116/house/members/leaving.json'

function getRetiringMembers() {
    return request
        .get(oldUrl)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                const { members } = data.results[0];
                const outOfOffice = filter(members, (member) => moment(member.end_date).isBefore())
                return map(outOfOffice, 'id');
            } catch (e) {
                console.log(e);
            }
        })
        .catch(e => {
            console.log(e)
        })
}

    getRetiringMembers()
        .then(allRetiringMembers => {
            console.log(allRetiringMembers)
            allRetiringMembers.map(propublicaId => {
                let houseRef = firebasedb.firestore.collection('house_reps').doc(propublicaId);
                let senateRef = firebasedb.firestore.collection('senators').doc(propublicaId);
                houseRef.get().then(function (querySnapshot) {
                    if (querySnapshot.data()) {
                        houseRef.update({in_office : false})
                    }
                })
                senateRef.get().then(function (querySnapshot) {
                    if (querySnapshot.data()) {
                        senateRef.update({in_office : false})
                    }
                })
                return propublicaId;
            }).forEach(propublicaId => {
                console.log('retiring', propublicaId)

                let personRef = firebasedb.firestore.collection('office_people').doc(propublicaId);
                personRef.get().then((snapshot) => {
                    if (snapshot.data()) {
                        personRef.update({in_office: false})
                    }
                })
            })
        })
        .catch(console.log)
