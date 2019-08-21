const firebase = require('./setupFirebase');
const ErrorReport = require('./errorReporting');


const checkOpenStatesMember = (openStatesMember) => {
    // Returns the object found in the case that the person was found
    // Returns false if no person was found
    // The object data is required rather than just `true` because we need to know whether
    // to update existing data or create entirely new data
    let stateLegRef = firebase.firestore.collection(`${openStatesMember.state}_state_legislature`)
    let queryRef = stateLegRef.doc(openStatesMember.id)

    return queryRef.get().then(function (querySnapshot) {
        // If document exists, simply return the data
        if (querySnapshot.exists) {
            return querySnapshot.data();
        }

        // We haven't returned yet indicating the document did not exist
        // Query by displayName
        let queryRef = stateLegRef.where('display_name', '==', openStatesMember.openStatesDisplayName)
        return queryRef.get().then(function (querySnapshot) {
            // If query was not empty, return the first of found documents
            if (!querySnapshot.empty) {
                const foundMembers = [];
                querySnapshot.forEach(doc => foundMembers.push(doc.data()));

                // Double check and return if there is only one document (one found member)
                if (foundMembers.length == 1) {
                    return foundMembers[0];
                }

                // Catch-all / multiple members with same name error
                return Promise.reject(
                    `Multiple members found with same name: ${openStatesMember.openStatesDisplayName}`
                );
            }

            // We haven't returned, nothing was found by id or by display name, return false
            return false;
        }).catch(function(error) {
            console.log(error);
            let errorEmail = new ErrorReport(`${newMember.govtrack_id}: ${error}`, 'Could not find open states member');
            // errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
        });
    }).catch(function(error) {
        console.log(error);
        let errorEmail = new ErrorReport(`${newMember.govtrack_id}: ${error}`, 'Could not find open states member');
        // errorEmail.sendEmail('Megan Riel-Mehan <meganrm@townhallproject.com>');
    });
};

module.exports = {
    checkOpenStatesMemberInDb: checkOpenStatesMember
};
