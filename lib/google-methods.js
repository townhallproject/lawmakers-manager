

// getNewToken(oauth2Client, read);
const googleMethods = {};
googleMethods.read = (sheets, spreadsheetId, range) => {

    return new Promise(function(resolve, reject) {
        sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
        }, function(err, result) {
            if(err) {
        // Handle error
                console.log(err);
                reject(err);
            } else {
                resolve(result.data.values);
            }
        });
    });
};

googleMethods.readMultipleRanges = (sheets, spreadsheetId, ranges) => {

    return new Promise(function (resolve, reject) {
        sheets.spreadsheets.values.batchGet({
            spreadsheetId: spreadsheetId,
            ranges: ranges,
        }, function (err, result) {
            if (err) {
        // Handle error
                console.log(err);
                reject(err);
            } else {
                resolve(result.valueRanges);
            }
        });
    });
};

googleMethods.getSheets = (sheets, spreadsheetId) => {

    return new Promise(function (resolve, reject) {
        sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            includeGridData: false,
            ranges: [],
        }, function (err, result) {
            if (err) {
        // Handle error
                console.log(err);
                reject(err);
            } else {
                let toReturn = result.sheets.map(ele => {
                  return ele.properties.title;
              });
                resolve(toReturn);
            }
        });
    });
};

googleMethods.write = (sheets, sheetId, data) => {

    sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
            valueInputOption: 'USER_ENTERED',
            data: data,

        },
    }, function(err, result) {
        if(err) {
    // Handle error
            console.log(err);
        } 
    });
};
module.exports = googleMethods;
