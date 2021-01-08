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
    constructor(opts, status, statusCitation, quote, nomineeStatusNo, electionAcknowledgmentStatus, electionAcknowledgmentCitation, impeachmentStatusNo, impeachmentCitation) {
        this.displayName = opts.displayName;
        this.party = opts.party;
        this.status = status;
        this.nomineeStatus = nomineeStatusNo;
        this.electionAcknowledgmentStatus = electionAcknowledgmentStatus;
        this.electionAcknowledgmentCitation = electionAcknowledgmentCitation;
        this.impeachmentStatus = impeachmentStatusNo;
        this.impeachmentCitation = impeachmentCitation;
        this.statusCitation = statusCitation;
        this.quote = quote;
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
            status: senator.status,
            statusCitation: senator.statusCitation,
            nomineeStatus: senator.nomineeStatus || null,
            electionAcknowledgmentStatus: senator.electionAcknowledgmentStatus,
            electionAcknowledgmentCitation: senator.electionAcknowledgmentCitation || "",
            impeachmentStatus: senator.impeachmentStatus,
            impeachmentCitation: senator.impeachmentCitation || "",
            quote: senator.quote,
            govtrack_id: senator.govtrack_id,
            state: senator.state,
            seniority: senator.seniority,
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
        return new Senator(data, data.status)
    }
}


const sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client
});
googleMethods
    .read(sheets, SHEETS_ID, "[PUBLIC DATA] Whip Count!A2:AB101")
    .then(googleRows => {
        const total = googleRows.length;
        let done = 0;
        googleRows.forEach(async (row, index) => {
            const [
                memberId, 
                firstName, 
                lastName, 
                party, 
                status, 
                statusCitation, 
                quoteText, 
                quoteCitation, 
                quoteYear,
                nomineeStatus,
                nomineeStatusCitation,
                scotusExpansionStatus,
                scotusExpansionCitation,
                lowerCourtExpansionStatus, 
                lowerCourtExpansionCitation,
                courtTermLimitsStatus,
                courtTermLimitsCitation,
                filibusterReformStatus,
                filibusterReformCitation,
                ethicsTransparencyStatus,
                ethicsTransparencyCitation,
                dcStatehoodStatus,
                dcStatehoodCitation,
                electionAcknowledgmentStatus,
                electionAcknowledgmentCitation,
                electionOldQuote,
                impeachmentStatus,
                impeachmentCitation,
            ] = row;
            let quote = null;
            if (quoteText) {
                quote = {
                    text: quoteText,
                    citation: quoteCitation || null,
                    year: quoteYear || null,
                }
            }
            if (!memberId) {
                return;
            }
            const snapshot = await firebasedb.firestore.collection('office_people').doc(memberId)
                .get();
            const data = snapshot.data();
            const statusNo = status ? status.split('. ')[0] : "6";
            const nomineeStatusNo = nomineeStatus ? nomineeStatus.split('. ')[0] : "3";
            const electionStatusNo = electionAcknowledgmentStatus ? electionAcknowledgmentStatus.split('. ')[0] : "4";
            const electionStatusCitation = electionAcknowledgmentCitation;
            const impeachmentStatusNo = impeachmentStatus ? impeachmentStatus.split('. ')[0] : "3";
            const senator = new Senator(data, statusNo, statusCitation || null, quote, nomineeStatusNo, electionStatusNo, electionStatusCitation, impeachmentStatusNo, impeachmentCitation);
            const dataToWrite = senateConverter.toFirestore(senator);
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