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
    constructor(opts, status, statusCitation, quote, additionalStatuses ) {
        this.displayName = opts.displayName;
        this.party = opts.party;
        this.status = status;
        this.statusCitation = statusCitation;
        this.quote = quote;

        for (const key in additionalStatuses) {
            this[key] = additionalStatuses[key];    
        }
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
            nomineeStatus: senator.nomineeStatusNo || null,
            electionAcknowledgmentStatus: senator.electionStatusNo,
            electionAcknowledgmentCitation: senator.electionStatusCitation || "",
            impeachmentStatus: senator.impeachmentStatusNo,
            impeachmentCitation: senator.impeachmentCitation || "",
            filibusterReformStatus: senator.filibusterReformStatusNo,
            filibusterReformCitation: senator.filibusterReformCitation || "",
            dcStatehoodStatus: senator.dcStatehoodStatusNo,
            dcStatehoodCitation: senator.dcStatehoodCitation || "",
            hr1Status: senator.hr1StatusNo,
            hr1Citation: senator.hr1Citation || "",
            hr4Status: senator.hr4statusNo || "",
            hr4Citation: senator.hr4Citation || "",
            impeachmentTrialStatus: senator.impeachmentStatusNo,
            impeachmentTrialCitation: senator.impeachmentTrialCitation || "",
            quote: senator.quote,
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
        return new Senator(data, data.status)
    }
}


const sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client
});
googleMethods
    .read(sheets, SHEETS_ID, "[PUBLIC DATA] Whip Count!A2:AH101")
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
                impeachmentTrialStatus, 
                impeachmentTrialCitation,
                hr1Status,
                hr1Citation,
                hr4status, 
                hr4Citation
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
                console.log(row)
                done++;
                return;

            }
            const formatNumber = (status, defaultValue) => status ? status.split('. ')[0] : defaultValue;
            const snapshot = await firebasedb.firestore.collection('office_people').doc(memberId)
                .get();
            const data = snapshot.data();
            const statusNo = status ? status.split('. ')[0] : "6";
            const nomineeStatusNo = nomineeStatus ? nomineeStatus.split('. ')[0] : "3";
            const electionStatusNo = electionAcknowledgmentStatus ? electionAcknowledgmentStatus.split('. ')[0] : "4";
            const electionStatusCitation = electionAcknowledgmentCitation;
            const impeachmentStatusNo = formatNumber(impeachmentStatus, "3");
            const dcStatehoodStatusNo = formatNumber(dcStatehoodStatus, "3");
            const filibusterReformStatusNo = formatNumber(filibusterReformStatus, "3");
            const impeachmentTrialStatusNo = formatNumber(impeachmentTrialStatus, "3");
            const hr1StatusNo = formatNumber(hr1Status, "3");
            const hr4statusNo = formatNumber(hr4status, "3");

            if (!data) {
                done++;
                return console.log(memberId)
            }
            const senator = new Senator(
                data, 
                statusNo, 
                statusCitation || null, 
                quote,
                {
                    nomineeStatusNo,
                    nomineeStatusCitation: nomineeStatusCitation || "",
                    electionStatusNo,
                    electionStatusCitation: electionStatusCitation || "",
                    impeachmentStatusNo,
                    impeachmentCitation: impeachmentCitation || "",
                    filibusterReformStatusNo,
                    filibusterReformCitation: filibusterReformCitation || "",
                    dcStatehoodStatusNo,
                    dcStatehoodCitation: dcStatehoodCitation || "",
                    hr1StatusNo,
                    hr1Citation,
                    hr4statusNo,
                    hr4Citation,
                    impeachmentTrialStatusNo,
                    impeachmentTrialCitation
                })
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