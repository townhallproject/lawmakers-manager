const firebaseRealTimeDB = require('./setupFirebase.js').realtimedb;

module.exports = () => {
    return firebaseRealTimeDB.ref('states').once('value')
        .then((snapshot) => {
            const stateLegs = {};
            snapshot.forEach((stateSnap) => {
                let stateData = stateSnap.val();
                if (stateData.state_legislature_covered) {
                    stateLegs[stateData.stateName] = stateSnap.key
                }
            })
            return stateLegs
        })
        .catch(e => console.log('error getting states', e))
}