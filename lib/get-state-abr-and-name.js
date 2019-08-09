const map = require('lodash').map;
const mapping = require('../data/stateMap');

const getStateNameFromAbr = (stateAbr) => {
    return mapping[stateAbr];
}

const getStateAbrFromName = (stateName) => {
    return map(mapping, (value, key) => {
        if (value === stateName) {
            return key;
        }
        return undefined;
    })
}

module.exports = {
    getStateAbrFromName,
    getStateNameFromAbr,
}