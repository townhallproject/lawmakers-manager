#!/usr/bin/env node

function errorReport(error, subject, to) {
  this.from = 'Town Hall Updates <update@updates.townhallproject.com>';
  this.to = to || 'Megan Riel-Mehan <meganrm@townhallproject.com>';
  this.subject = subject || 'Something has gone terribly wrong';
  try {
    this.html = JSON.stringify(error);
  }
  catch (e) {
    this.html = error;
  }
  // if (typeof(error) === 'object') {
  //   var str='';
  //   Object.keys(error).forEach(function(key){
  //     str+= key + ': ' + error[key]+'; </br>';
  //   });
  //   this.html = str;
  // } else {
  //   this.html = error;
  // }
}

// settings for mailgun
var mailgun_api_key = process.env.MAILGUN_API_KEY2;
var domain = 'updates.townhallproject.com';

if (process.env.NODE_ENV==='production'){
  var mailgun = require('mailgun-js')({apiKey: mailgun_api_key, domain: domain});
  
  errorReport.prototype.sendEmail = function(){
    var data = this;
    console.log('sending');
    mailgun.messages().send(data, function () {
    });
  };
} else {
  errorReport.prototype.sendEmail = ()=> {
    console.log('ERROR REPORT:', this);
  };
}


module.exports = errorReport;
