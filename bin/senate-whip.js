#!/usr/bin/env node

require('dotenv').config();
const {
    google
} = require('googleapis');

const readline = require('readline');


const firebasedb = require('../lib/setupFirebase.js');
const googleMethods = require('../lib/google-methods');

const SHEETS_ID = '1Dpg0iY1LKTEEzQ80ESZ-nbSXkUkRi8Kjobysu4-AAkA';


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const clientId = process.env.GOOGLE_CLIENT_ID;
const redirectUrl = process.env.GOOGLE_REDIRECT_URI_1;
const currentToken = {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    token_type: 'Bearer',
    expiry_date: 1522106489761,
};

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
oAuth2Client.credentials = currentToken;

class Senator {
    constructor(opts, issues) {
        this.displayName = opts.displayName;
        this.party = opts.party;

        this.issues = issues
        this.last_name = opts.last_name || null;
        this.first_name = opts.first_name || null;
        this.govtrack_id = opts.govtrack_id;
        if (!opts.roles) {
            console.log('no role', opts.displayName);
        }
        const office = opts.roles[0];
        this.state = office.state;
        this.seniority = office.seniority;
        this.contact = {
            phone: office.phone,
            address: office.address,
        }
        this.socials = {
            facebook: opts.facebook,
            twitter: opts.twitter,
            url: opts.url
        }
    }
    toString() {
        return this.name + ', ' + this.state + ', ' + this.country;
    }
}

// Firestore data converter
var senateConverter = {
    toFirestore: function (senator) {

        return {
            displayName: senator.displayName,
            last_name: senator.last_name,
            first_name: senator.first_name,
            party: senator.party,
            issues: senator.issues,
            govtrack_id: senator.govtrack_id,
            state: senator.state,
            seniority: senator.seniority || null,
            contact: {
                phone: senator.contact.phone || null,
                address: senator.contact.address || null,
            },
            socials: {
                facebook: senator.socials.facebook || null,
                twitter: senator.socials.twitter || null,
                url: senator.socials.url || null
            }
        }
    },
    fromFirestore: function (snapshot, options) {
        const data = snapshot.data(options);
        return new Senator(data, data.issues)
    }
}


const sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client
});

const getMetaData = (callback) => {
    return googleMethods.read(sheets, SHEETS_ID, "Whip Count Metadata!A2:M")
        .then(googleRows => {
            const rows = googleRows.filter((row) => row[0]); //has ID
            const total = rows.length;
            let done = 0;
            const topics = [];
            let endColumn = "A"
            return rows.forEach(async (row, index) => {
                const [id, name, description, aboutLink, aboutLinkText, statusText1, statusText2, statusText3, statusText4, statusText5, statusColumn, citationColumn, active] = row

                const dataToWrite = {
                    id,
                    name,
                    description,
                    aboutLink,
                    aboutLinkText,
                    statusText: [statusText1, statusText2, statusText3, statusText4, statusText5],
                    statusColumn,
                    citationColumn,
                    active: active === 'TRUE'
                }
                if (googleMethods.convertColumnToNumber(citationColumn) > googleMethods.convertColumnToNumber(endColumn)) {
                    endColumn = citationColumn
                }
                topics.push(dataToWrite)
                return firebasedb.firestore.collection('whip_count_metadata').doc(id).set(dataToWrite)
                    .then(() => {
                        done++;
                        if (done === total) {
                            callback(endColumn, topics);

                        } else {
                            return false;
                        }
                    }).catch((err) => {

                        console.log(dataToWrite, err)
                    })

            })

        })
}

const getMemberData = (endColumn, topics) => {
    console.log("LAST COLUMN TO READ", endColumn)
    googleMethods
        .read(sheets, SHEETS_ID, `[PUBLIC DATA] Whip Count!A2:${endColumn}101`)
        .then(googleRows => {
            const total = googleRows.length;
            let done = 0;
            googleRows.forEach(async (row, index) => {
                const [
                    memberId,
                    firstName,
                    lastName,
                    party,
                ] = row;
                const formatNumber = (status, defaultValue) => {
                    // if (status) {
                    //     const splitResult = status.split(/(. |.\t)/g)[0];
                    //     if (isNaN(splitResult)) {
                    //         console.log(status, status.split('. '))
                    //     }
                    // }
                    return status ? status.split(/(. |.\t)/g)[0] : defaultValue;
                }
                const issues = topics.reduce((acc, topic) => {
                    const statusIndex = googleMethods.convertColumnToNumber(topic.statusColumn) - 1;
                    const citationIndex = googleMethods.convertColumnToNumber(topic.citationColumn) - 1;

                    const status = formatNumber(row[statusIndex], "3");
                    const citation = row[citationIndex] || "";
                    acc[topic.id] = {
                        status,
                        citation,
                    }
                    return acc;
                }, {});

                if (!memberId) {
                    console.log(row)
                    done++;
                    return;

                }
                const snapshot = await firebasedb.firestore.collection('office_people').doc(memberId)
                    .get();
                const data = snapshot.data();

                if (!data) {
                    done++;
                    return console.log(memberId)
                }
                const senator = new Senator(
                    data,
                    issues,
                )
                const dataToWrite = senateConverter.toFirestore(senator);
                // for (const key in dataToWrite) {
                //     if (Object.hasOwnProperty.call(dataToWrite, key)) {
                //         const element = dataToWrite[key];
                //         if (element === undefined) {
                //             console.log(dataToWrite.displayName, key)
                //         }
                //     }
                // }   
                return firebasedb.firestore.collection('whip_count_2020').doc(memberId).set(dataToWrite)
                    .then(() => {
                        done++;
                        if (done === total) {
                            process.exit(0)

                        }
                    }).catch((err) => {

                        console.log(dataToWrite, err)
                    })

            })
        })
        .catch(err => {
            console.log("error reading sheet:", err.message)
            process.exit(1)
        })
}

getMetaData(getMemberData)