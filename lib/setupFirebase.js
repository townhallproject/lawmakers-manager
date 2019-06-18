require('dotenv').load();
const admin = require('firebase-admin');

const testing = process.env.NODE_ENV !== 'production';
const key = testing ? process.env.TESTING_FIREBASE_TOKEN : process.env.CLOUD_FIREBASE_TOKEN
var firebasekey = key.replace(/\\n/g, '\n');
console.log("TESTING:", testing)
// {
//   "type": "service_account",
//   "project_id": "thp-office-people",
//   "private_key_id": "4a40dd09596910b41ae1c8a433d23be46d690a4d",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCSphreAFKB0qaE\nfEAWoMpItxgzO8tuUMeQoWHPbGB9jWyBSGN+biUM/nhPd2jg38dQprdWnbp/MTEV\nBzq32bmn56EwJNu+fNxjzFrGr9jnB8TYSiOSau8ExobTmIQdlVYcYfaJgEdDbW75\n9FnAu2miQ8dYrSfFJtFVFbsEud7nieq90nZOrQJDjNZAVPvxeACN00Bu9XyZhALg\nNUd3+vI2eymuieZRuxMEqC8C0FtDt6nbJWyGjRi8Y9i5yY+tv4vOGQ8rnR86lIzK\nRAb6sOW2aweWKn3epilOzahzH53x0ApaJhCgQpJpGZSOWZyj+EwTBD4tI9Te8oiy\nOSyg8dKBAgMBAAECggEAAcnE+NlF6EeYaHPn56a7BLc31DMZ1EznnA29trTmec1y\nSeLHNMzUxpNpReXJuXk9EdCQmn2mnyOrSqt5hbGh1Ahs5JyEce6NlOlyX2sYQNvt\nRGpmA+RqKPOfQ///d2lhYQv4QL230LyKPoHCYOlgHL6JFR2aZyrloU0YKFL4Yvgc\nstpNeYB8WTUPos64qqsOZstw5R8+hqhNrf4EmDbv9q0EjoKQIYkRevWvEG/fAy2E\n0bQi/GyAvRZvS70ut5x+9YLFy9hj4feopbmFVBAvzLnl0eAD5RUwjNYA5aVNMV95\nbez2VaZ+iDj+ZALh2+wD67vmiLrNJCyZ4shw00oiuQKBgQDF1wby9KgAFB9I9rpl\n7XjbD9fDFBQRqt114H+OWeLjizbBM3esBs1dd/ldLQjc96nqSoPv9e5bR4J5r014\nL+EugTmgDNyC0Z10wer6Jz+FEB0NZXLfM9Mh9rljoM3gRW0Rr6+zxttBEf5T9iDA\nfWF8XY6l3Ed0Vhub5RL/Oml2aQKBgQC9wo4PpcuNt1NVWS/B5iH2VAbhpP8+MdvS\nOE77osn0cbCxMP3rnXmd/qzPUEtA7y6gDy7wyu1qBC5+Le4wyQrpIY0gMjGpY8lJ\ne+aCAdlLiM8k1GOZ/aXbU+W+ToL3ZpOl2Ohndv2frTE9eDhCxABgjCa+MhRwj1Q+\nKt371SVoWQKBgQCNV0ryplGkBLw5H3QZv+eY8Z+fEigoWx7uyR24MIWFNP9AVinI\nL+/mOAFiTPtJCnNNHEFYXSYV9mfD0bcSB3rkA5SMwMOFfoX0VVovr3yU7ucim/jO\nd7L+T8sw30BWWqNKgG6RjJ81xMojZ/MMMkdEV37DBjXSanY9ERJaX3vbCQKBgFUN\n4l0TJETWGg0UV7qiazCdAySarylycaQtRwG1Oq5NUzRo0DeOsxdlMpIN3F0zmAN4\nKsMVQgsV6rz122CUjEZomngG54mUR4GffndhWsNng+lvJWG9dlzzovOE/2Di4mUg\n7zKI/C9ZEswJmbYbYkvkJe10RwMYy1q+HheltwmpAoGAcaiHWYUDG3RrY3sU812n\nvQTctQnQ/b17afNCqmLFT9aXtfb5lQKVW/KDASLhLCzuZjG4Gqp8VFFreyhYm1B2\nqCdnIUb62QvQAaJWGGaMxEE0T335i+/YnLVbSfxZblv5kLdhLD61V4wy1H14p9Vq\nHySQLgfnJij1QvXMT9xjNis=\n-----END PRIVATE KEY-----\n",
//   "client_email": "firebase-adminsdk-t3cec@thp-office-people.iam.gserviceaccount.com",
//   "client_id": "101618582786089861672",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-t3cec%40thp-office-people.iam.gserviceaccount.com"
// }
admin.initializeApp({
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": "thp-office-people",
    "private_key_id": "4a40dd09596910b41ae1c8a433d23be46d690a4d",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCSphreAFKB0qaE\nfEAWoMpItxgzO8tuUMeQoWHPbGB9jWyBSGN+biUM/nhPd2jg38dQprdWnbp/MTEV\nBzq32bmn56EwJNu+fNxjzFrGr9jnB8TYSiOSau8ExobTmIQdlVYcYfaJgEdDbW75\n9FnAu2miQ8dYrSfFJtFVFbsEud7nieq90nZOrQJDjNZAVPvxeACN00Bu9XyZhALg\nNUd3+vI2eymuieZRuxMEqC8C0FtDt6nbJWyGjRi8Y9i5yY+tv4vOGQ8rnR86lIzK\nRAb6sOW2aweWKn3epilOzahzH53x0ApaJhCgQpJpGZSOWZyj+EwTBD4tI9Te8oiy\nOSyg8dKBAgMBAAECggEAAcnE+NlF6EeYaHPn56a7BLc31DMZ1EznnA29trTmec1y\nSeLHNMzUxpNpReXJuXk9EdCQmn2mnyOrSqt5hbGh1Ahs5JyEce6NlOlyX2sYQNvt\nRGpmA+RqKPOfQ///d2lhYQv4QL230LyKPoHCYOlgHL6JFR2aZyrloU0YKFL4Yvgc\nstpNeYB8WTUPos64qqsOZstw5R8+hqhNrf4EmDbv9q0EjoKQIYkRevWvEG/fAy2E\n0bQi/GyAvRZvS70ut5x+9YLFy9hj4feopbmFVBAvzLnl0eAD5RUwjNYA5aVNMV95\nbez2VaZ+iDj+ZALh2+wD67vmiLrNJCyZ4shw00oiuQKBgQDF1wby9KgAFB9I9rpl\n7XjbD9fDFBQRqt114H+OWeLjizbBM3esBs1dd/ldLQjc96nqSoPv9e5bR4J5r014\nL+EugTmgDNyC0Z10wer6Jz+FEB0NZXLfM9Mh9rljoM3gRW0Rr6+zxttBEf5T9iDA\nfWF8XY6l3Ed0Vhub5RL/Oml2aQKBgQC9wo4PpcuNt1NVWS/B5iH2VAbhpP8+MdvS\nOE77osn0cbCxMP3rnXmd/qzPUEtA7y6gDy7wyu1qBC5+Le4wyQrpIY0gMjGpY8lJ\ne+aCAdlLiM8k1GOZ/aXbU+W+ToL3ZpOl2Ohndv2frTE9eDhCxABgjCa+MhRwj1Q+\nKt371SVoWQKBgQCNV0ryplGkBLw5H3QZv+eY8Z+fEigoWx7uyR24MIWFNP9AVinI\nL+/mOAFiTPtJCnNNHEFYXSYV9mfD0bcSB3rkA5SMwMOFfoX0VVovr3yU7ucim/jO\nd7L+T8sw30BWWqNKgG6RjJ81xMojZ/MMMkdEV37DBjXSanY9ERJaX3vbCQKBgFUN\n4l0TJETWGg0UV7qiazCdAySarylycaQtRwG1Oq5NUzRo0DeOsxdlMpIN3F0zmAN4\nKsMVQgsV6rz122CUjEZomngG54mUR4GffndhWsNng+lvJWG9dlzzovOE/2Di4mUg\n7zKI/C9ZEswJmbYbYkvkJe10RwMYy1q+HheltwmpAoGAcaiHWYUDG3RrY3sU812n\nvQTctQnQ/b17afNCqmLFT9aXtfb5lQKVW/KDASLhLCzuZjG4Gqp8VFFreyhYm1B2\nqCdnIUb62QvQAaJWGGaMxEE0T335i+/YnLVbSfxZblv5kLdhLD61V4wy1H14p9Vq\nHySQLgfnJij1QvXMT9xjNis=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-t3cec@thp-office-people.iam.gserviceaccount.com",
    "client_id": "101618582786089861672",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-t3cec%40thp-office-people.iam.gserviceaccount.com"
  })
});


// admin.database.enableLogging(true);
module.exports = admin.firestore();
