const firebasedb = require('../lib/setupFirebase.js');
var statesAb = require('../data/stateMap.js');
const Office = require('./office');

class Moc {
    constructor(opts, id) {
        for (let key in opts) {
            if (opts[key]) {
                this[key] = opts[key];
            }
        }
        this.id = opts.propublica_id || opts.member_id;
        this.govtrack_id = opts.govtrack_id || id;
        this.propublica_id = opts.propublica_id || opts.member_id
        this.propublica_facebook = opts.facebook_account;
        if (parseInt(this.propublica_facebook)) {
            this.propublica_facebook = parseInt(this.propublica_facebook);
        }
        if (opts.current_party && opts.current_party.toLowerCase() === 'd') {
            this.party = 'Democratic';
        } else if (opts.current_party && opts.current_party.toLowerCase() === 'r') {
            this.party = 'Republican';
        } else if (opts.current_party) {
            this.party = 'Independent';
        }
        delete this.facebook_account;
    }

    createNew(newPropublicaMember) {
        let updates = firebasedb.firestore.batch();
   
        newPropublicaMember.displayName = this.first_name + ' ' + this.last_name;
        newPropublicaMember.end_date = newPropublicaMember.roles[0].end_date;
        newPropublicaMember.current_office_index = 0; //TODO: decide if we want these to be uids
        const govtrack_id = this.govtrack_id || newPropublicaMember.govtrack_id;

        const memberIDObject = {
            id: this.propublica_id,
            govtrack_id: govtrack_id || null,
            display_name: this.displayName || newPropublicaMember.displayName,
            in_office: true,
        };

        const chamberMapping = {
            House: 'lower',
            Senate: 'upper',
        }
        const moc = {
            ...this,
            ...newPropublicaMember,
        }
        newPropublicaMember.roles = newPropublicaMember.roles.map(role => {
            return {...new Office(this.propublica_id, role.state, chamberMapping[role.chamber], 'federal', 'won', role)}
        })
        console.log(moc.party)
        // Set the data object
        var personDataRef = firebasedb.firestore.collection('office_people').doc(this.propublica_id);
        updates.set(personDataRef, moc);

        // Add to the lookup table
        const collection = this.chamber === 'upper' ? 'senators': 'house_reps';
        const congressCollection = '116th_congress'
        var collectionRef = firebasedb.firestore.collection(collection).doc(this.propublica_id);
        var congressCollectionRef = firebasedb.firestore.collection(congressCollection).doc(this.propublica_id);
        updates.set(collectionRef, memberIDObject);
        updates.set(congressCollectionRef, memberIDObject);

        return updates.commit().then(function () {
            console.log('successfully added', newPropublicaMember.displayName)
        }).catch(console.log)
    }

    update(collection) {
        console.log(this)
        const ref = firebasedb.firestore.collection('office_people').doc(this.id);
        ref.update(this);
    }

    // updateMocByStateDistrict(){
    //     let moc = this;
    //     if (!moc.in_office) {
    //         return;
    //     }
    //     let path;
    //     let obj = {
    //         govtrack_id: moc.govtrack_id || null,
    //         propublica_id: moc.propublica_id || null,
    //         displayName: moc.displayName || null,
    //     };
    //     if (moc.type === 'sen') {
    //         path = `mocByStateDistrict/${moc.state}/${moc.state_rank}/`;
    //     } else if (moc.type === 'rep') {
    //         let district;
    //         if (moc.at_large === true) {
    //             district = '00';
    //         } else {
    //             district = zeropadding(moc.district);
    //         }
    //         path = `mocByStateDistrict/${moc.state}-${district}/`;
    //     }
    //     return firebasedb.ref(path).update(obj);
    // }

    // static makeNewEndpoints() {
    //     Moc.loadAllData()
    //         .then((allMocs) => {
    //             allMocs.forEach((moc) => {
    //                 let newMoc = new Moc(moc);
    //                 newMoc.updateMocByStateDistrict();
    //             });
    //         });
    // };

    // static loadAllData() {
    //     var allMocs = [];
    //     return new Promise(function (resolve, reject) {
    //         firebasedb.ref('mocData/').once('value').then(function (snapshot) {
    //             snapshot.forEach(function (member) {
    //                 const memberobj = new Moc(member.val());
    //                 allMocs.push(memberobj);
    //             });
    //             resolve(allMocs);
    //         });
    //     });
    // };

}

module.exports = Moc;
