#!/usr/bin/env node
const request = require('superagent');
const firebasedb = require('../lib/setupFirebase.js');
const ErrorReport = require('../lib/errorReporting.js');
const Moc = require('../models/moc');

firebasedb.firestore.collection('house_reps').get()
    .then(snap => {
        console.log(snap.size)

        snap.forEach(async repSnap => {
            
            const congressCheck = await firebasedb.firestore.collection('117th_congress').doc(repSnap.id).get()
            if (!congressCheck.exists) {
                console.log('not in congress anymore', repSnap.data().displayName)
                firebasedb.firestore.collection('house_reps').doc(repSnap.id).delete()
            }
        })
    })

firebasedb.firestore.collection('senators').get()
    .then(snap => {
                console.log(snap.size)

        snap.forEach(async repSnap => {

            const congressCheck = await firebasedb.firestore.collection('117th_congress').doc(repSnap.id).get()
            if (!congressCheck.exists) {
                console.log('not in congress anymore', repSnap.data().displayName, repSnap.id)
                firebasedb.firestore.collection('senators').doc(repSnap.id).delete()
            }
        })
    })

