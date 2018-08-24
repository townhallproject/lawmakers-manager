
function ScrapingModule() {}

ScrapingModule.firebasedb = require('./setupFirebase');

ScrapingModule.getTownhalls = function() {
  return new Promise(function(resolve) {
    // Get list of existing townhalls so we don't submit duplicates
    var existingTownHallIds = [];

    ScrapingModule.firebasedb.ref('/townHallIds/').once('value').then(function(snapshot){
      snapshot.forEach(node => {
        existingTownHallIds.push(node.val().eventId);
      });

      ScrapingModule.firebasedb.ref('mocData/').once('value').then((snapshot) => {
        resolve ({
          existingTownHallIds: existingTownHallIds,
          MoCs: snapshot.val(),
        });
      });
    });
  });
};

ScrapingModule.removeExistingIds = function(existingTownHallIds, eventIds) {
  existingTownHallIds.forEach(existingId => {
    let position = eventIds.indexOf(existingId);
    if (position !== -1) {
      eventIds.splice(position, 1);
    }
  });
  return eventIds;
};

ScrapingModule.unqiueFilter = function(value, index, self) {
  return self.findIndex(obj => obj.id === value.id) === index;
};

ScrapingModule.submitTownhall = function(townhall) {
  var updates = {};
  updates['/townHallIds/' + townhall.eventId] = {
    eventId: townhall.eventId,
    lastUpdated: Date.now(),
  };
  updates['/UserSubmission/' + townhall.eventId] = townhall;
  if (process.env.NODE_ENV === 'production') {
    return ScrapingModule.firebasedb.ref().update(updates);
  }
  return Promise.resolve(`test submit worked, ${townhall.eventId}`);
};

module.exports = ScrapingModule;
