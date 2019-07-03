require('dotenv').load();
const admin = require('firebase-admin');

const testing = process.env.NODE_ENV !== 'production';
const key = testing ? process.env.TESTING_FIREBASE_TOKEN : process.env.CLOUD_FIREBASE_TOKEN
var firebasekey = key.replace(/\\n/g, '\n');
console.log("TESTING:", testing)

admin.initializeApp({
  credential: admin.credential.cert({
    "type": "",
    "project_id": "",
    "private_key_id": "",
    "private_key": "",
    "client_email": "",
    "client_id": "",
    "auth_uri": "",
    "token_uri": "",
    "auth_provider_x509_cert_url": "",
    "client_x509_cert_url": ""
   })
});


// admin.database.enableLogging(true);
module.exports = admin.firestore();
