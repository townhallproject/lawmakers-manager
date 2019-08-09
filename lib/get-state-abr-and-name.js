const filter = require('lodash').filter;
const map = require('lodash').map;

const mapping = require('../data/stateMap');

const getStateNameFromAbr = (stateAbr) => {
    return mapping[stateAbr];
}

const getStateAbrFromName = (stateName) => {
    return filter(map(mapping, (value, key) => {
        if (value === stateName) {
            return key;
        }
    }))[0]
}

module.exports = {
    getStateAbrFromName,
    getStateNameFromAbr,
}