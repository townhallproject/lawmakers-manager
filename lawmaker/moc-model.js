const firebasedb = require('../lib/setupFirebase.js');
var statesAb = require('../data/stateMap.js');
const zeropadding = require('../lib/zeropadding');

class Moc {
    constructor(opts, id) {
        for (let keys in opts) {
            this[keys] = opts[keys];
        }
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
                this.chamber = 'House';
                this.district = data.district;
            }
            if (data.chamber === 'Senate') {
                this.chamber = 'Senate';
            }
        }
        delete this.roles;
        delete this.facebook_account;
        delete this.member_id;
        delete this.current_party;
    }

    createNew(newPropublicaMember) {
        let updates = {};
        this.displayName = this.first_name + ' ' + this.last_name;
        this.state = newPropublicaMember.roles[0].state;
        this.end_date = newPropublicaMember.roles[0].end_date;

        this.district = newPropublicaMember.roles[0].district || null;
        this.stateName = statesAb[this.state];
        const lastname = this.last_name.replace(/\W/g, '');
        const firstname = this.first_name.replace(/\W/g, '');
        const memberKey = lastname.toLowerCase() + '_' + firstname.toLowerCase();

        const memberIDObject = {
            id: this.govtrack_id,
            nameEntered: this.displayName,
        };

        updates['/mocData/' + this.govtrack_id] = this;
        updates['/mocID/' + memberKey] = memberIDObject;
        return firebasedb.ref().update(updates);
    }

    update(path) {
        console.log('existing member', this.govtrack_id);
        return firebasedb.ref(path).update(this);
    }

    updateMocByStateDistrict(){
        let moc = this;
        if (!moc.in_office) {
            return;
        }
        let path;
        let obj = {
            govtrack_id: moc.govtrack_id || null,
            propublica_id: moc.propublica_id || null,
            displayName: moc.displayName || null,
        };
        if (moc.type === 'sen') {
            path = `mocByStateDistrict/${moc.state}/${moc.state_rank}/`;
        } else if (moc.type === 'rep') {
            let district;
            if (moc.at_large === true) {
                district = '00';
            } else {
                district = zeropadding(moc.district);
            }
            path = `mocByStateDistrict/${moc.state}-${district}/`;
        }
        console.log(path, obj);
        return firebasedb.ref(path).update(obj);
    }

    static makeNewEndpoints() {
        Moc.loadAllData()
            .then((allMocs) => {
                allMocs.forEach((moc) => {
                    let newMoc = new Moc(moc);
                    newMoc.updateMocByStateDistrict();
                });
            });
    };
    
    static loadAllData() {
        var allMocs = [];
        return new Promise(function (resolve, reject) {
            firebasedb.ref('mocData/').once('value').then(function (snapshot) {
                snapshot.forEach(function (member) {
                    const memberobj = new Moc(member.val());
                    allMocs.push(memberobj);
                });
                resolve(allMocs);
            });
        });
    };

}

module.exports = Moc;
