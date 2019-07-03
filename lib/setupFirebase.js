require('dotenv').load();
const admin = require('firebase-admin');

const testing = process.env.NODE_ENV !== 'production';
const key = testing ? process.env.TESTING_FIREBASE_TOKEN : process.env.CLOUD_FIREBASE_TOKEN
var firebasekey = key.replace(/\\n/g, '\n');
console.log("TESTING:", testing)

var app = admin.initializeApp(
    {
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_ID,
            clientEmail: process.env.FIREBASE_EMAIL,
            privateKey: firebasekey
        }),
        databaseURL: process.env.FIREBASE_DB_URL
    }
);

// Export together as single object
module.exports = {
    firestore: app.firestore(),
    realtimedb: app.database()
};
