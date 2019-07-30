const firebasedb = require('../lib/setupFirebase.js');
var statesAb = require('../data/stateMap.js');
const zeropadding = require('../lib/zeropadding');

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
        if (opts.state) {
            this.state = opts.state;
            this.stateName = statesAb[opts.state];
        } else if (opts.roles[0].state) {
            let data = opts.roles[0];
            this.state = data.state;
            this.stateName = statesAb[this.state];
            if (data.chamber === 'House') {
                this.chamber = 'lower';
                this.district = data.district;
            }
            if (data.chamber === 'Senate') {
                this.chamber = 'upper';
            }
        }
        delete this.facebook_account;
        delete this.current_party;
    }

    createNew(newPropublicaMember) {
        let updates = firebasedb.firestore.batch();
        this.displayName = this.first_name + ' ' + this.last_name;
        this.state = newPropublicaMember.roles[0].state;
        this.end_date = newPropublicaMember.roles[0].end_date;

        this.district = newPropublicaMember.roles[0].district || null;
        this.stateName = statesAb[this.state];
        const lastname = this.last_name.replace(/\W/g, '');
        const firstname = this.first_name.replace(/\W/g, '');
        const memberKey = lastname.toLowerCase() + '_' + firstname.toLowerCase();
        const govtrack_id = this.govtrack_id || newPropublicaMember.govtrack_id
        const memberIDObject = {
            id: this.propublica_id,
            govtrack_id: govtrack_id,
            display_name: this.displayName,
            in_office: true,
        };

        // Set the data object
        var personDataRef = firebasedb.firestore.collection('office_people').doc(this.propublica_id);
        updates.set(personDataRef, newPropublicaMember);

        // Add to the lookup table
        const collection = this.chamber === 'upper' ? 'senators': 'house_reps';
        var collectionRef = firebasedb.firestore.collection(collection).doc(this.propublica_id);
        updates.set(collectionRef, memberIDObject);

        return updates.commit().then(function () {
            console.log('successfully added', memberIDObject.displayName)
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
