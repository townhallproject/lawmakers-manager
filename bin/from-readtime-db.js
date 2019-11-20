const admin = require('firebase-admin');
const find = require('lodash').find;

const firebase = require('../lib/setupFirebase.js');
const Moc = require('../models/moc');

firebase.realtimedb.ref('mocID').once('value')
    .then((mocIds) => {
        mocIds.forEach(moc => {

            const mocLookup = moc.val();
            firebase.realtimedb.ref(`mocData/${mocLookup.id}`).once('value')
                .then(mocSnap => {
                    const mocData = mocSnap.val();
                    let ref = firebase.firestore.collection('office_people')
                    let queryRef = ref.where('displayName', '==', mocData.displayName)
                    if (mocData.govtrack_id) {
                        
                        queryRef = ref.where('govtrack_id', '==', mocData.govtrack_id)
                    }
                    return queryRef.get().then(function (querySnapshot) {
                        if (!querySnapshot.empty) {
                            querySnapshot.forEach(person => {
                                const newPerson = person.data();
                                let personRef = firebase.firestore.collection('office_people').doc(newPerson.id);

                                const {
                                    roles
                                } = newPerson;
                                const newRoles = roles.map(role => {
                                    if (role.congress == "116" && mocData.missing_member) {
                                        role.missing_member = mocData.missing_member['116']
                                    } else if (role.congress == "115" && mocData.missing_member) {
                                        role.missing_member = mocData.missing_member['115']
                                    } else {
                                        role.missing_member = ""
                                    }
                                    if (role.missing_member === undefined) {
                                        role.missing_member = "";
                                    }
                                    return role;
                                })

                                personRef.update({ 
                                    roles: newRoles,
                                    facebook: mocData.facebook || "",
                                    facebook_account: mocData.facebook_account || "",
                                    facebook_campaign_account: mocData.facebook_campaign_account || "",
                                    facebook_official_account: mocData.facebook_official_account || "",
                                    facebook_personal_account: mocData.facebook_personal_account || "",
                                    last_submission: mocData.lastUpdated || "",
                                    last_submission_by: mocData.lastUpdatedBy || "",
                                    twitter: mocData.twitter || "",
                                }).then(() => {
                                    if (newPerson.displayName !== mocData.displayName) {
                                        console.log('changing display name', newPerson.id, mocData.displayName)
                                        Moc.updateDisplayName(newPerson.id, mocData.displayName)
                                    }
                                })
                  

                            })
                        } else {
                            // console.log('couldnt find', mocSnap.key)
                        }
                    }).catch(function (error) {
                        console.log(error)
                    })
                })
        })
        
    })

