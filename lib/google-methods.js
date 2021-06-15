// getNewToken(oauth2Client, read);
const googleMethods = {};
googleMethods.read = (sheets, spreadsheetId, range) => {

    return new Promise(function (resolve, reject) {
        sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
        }, function (err, result) {
            if (err) {
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
    }, function (err, result) {
        if (err) {
            // Handle error
            console.log(err);
        }
    });
};

googleMethods.convertColumnToNumber = (column) => {
    var mapToNum = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
        h: 8,
        i: 9,
        j: 10,
        k: 11,
        l: 12,
        m: 13,
        n: 14,
        o: 15,
        p: 16,
        q: 17,
        r: 18,
        s: 19,
        t: 20,
        u: 21,
        v: 22,
        w: 23,
        x: 24,
        y: 25,
        z: 26
    }
    if (column.length === 1) {
        return mapToNum[column.toLowerCase()]
    } else if (column.length === 2) {
        const multiplier = mapToNum[column[0].toLowerCase()];
        const toAdd = multiplier * 26
         return mapToNum[column[1].toLowerCase()] + toAdd;
    }
}
module.exports = googleMethods;