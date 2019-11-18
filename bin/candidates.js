const admin = require('firebase-admin');
const mapValues = require('lodash').mapValues;

const firebase = require('../lib/setupFirebase.js');
const Office = require('../models/office');

firebase.realtimedb.ref('candidate_keys').once('value')
    .then((candidates) => {
        candidates.forEach(candidate => {

            const candidateInfo = candidate.val();
            firebase.realtimedb.ref(`candidate_data/${candidateInfo.id}`).once('value')
                .then(candidateDataSnapshot => {
                    const candidateData = candidateDataSnapshot.val();
                    let stateLegRef = firebase.firestore.collection('office_people')
                    let queryRef = stateLegRef.where('displayName', '==', candidateData.displayName)
                    if (candidateData.govtrack_id) {
                        queryRef = stateLegRef.where('govtrack_id', '==', candidateData.govtrack_id)
                    }
                    return queryRef.get().then(function (querySnapshot) {
                        if (!querySnapshot.empty) {
                            querySnapshot.forEach(person => {
                                let personRef = firebase.firestore.collection('office_people').doc(person.id);
                                let campaign = new Office(
                                    person.id, 
                                    candidateData.state || person.data().state,
                                    candidateData.chamber,
                                    candidateData.level || 'federal',
                                    candidateData.status,
                                    candidateData,
                                    )
                                const cleanCampaign = mapValues(campaign, (value, key) => {
                                    if (value === undefined) {
                                        return null;
                                    }
                                    return value;
                                })
                                // personRef.update({
                                //     campaigns: ['test']
                                // })
                                // .then(() => {

                                    personRef.update({
                                        campaigns: admin.firestore.FieldValue.arrayUnion(cleanCampaign)
                                    }).catch(console.log)
                                // })
                                // .catch(console.log)

                            })
                        }
                    }).catch(function (error) {
                        console.log(error)
                    })
                })
        })
        
    })

