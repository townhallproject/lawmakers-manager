require('dotenv').load();
var admin = require('firebase-admin');
var firebasekey = process.env.FIREBASE_TOKEN.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ID,
    clientEmail: process.env.FIREBASE_EMAIL,
    privateKey: firebasekey,
    databaseAuthVariableOverride: {
      uid: 'read-only',
    },
  }),
  databaseURL: process.env.FIREBASE_DB_URL,
});

module.exports = admin.database();
