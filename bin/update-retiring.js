#!/usr/bin/env node

const request = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const  { map, find }  = require('lodash');
const Moc = require('../lawmaker/moc-model');
const propublicaAPI = process.env.PROPUBLICA;

const oldUrl = 'https://api.propublica.org/congress/v1/115/house/members/leaving.json'

function getRetiringMembers() {
    return request
        .get(oldUrl)
        .set('X-API-Key', propublicaAPI)
        .then((res) => {
            try {
                let data = JSON.parse(res.text);
                return map(data.results[0].members, 'id');
            } catch (e) {
                console.log(e);
            }
        })
        .catch(e => {
            console.log(e)
        })
}

Moc.loadAllData()
    .then(allcurrentmembers => {
        getRetiringMembers()
            .then(allRetiringMembers => {
                allRetiringMembers.map(propublicaId => {
                    const retiringData = find(allcurrentmembers, {
                        propublica_id: propublicaId
                    })
                    return retiringData.govtrack_id;
                }).forEach(govtrackId => {
                    console.log('retiring', govtrackId)
                    firebasedb.ref(`mocData/${govtrackId}`).update({retiring: true});
                })
            })
    })
