# Lawmakers Manager

A bunch of scripts that run on CRON jobs that populate the database(s) that store the basic legislator info for [TownHallProject](https://townhallproject.com/).


### Dev Deployment Setup:
1. Go to: https://console.firebase.google.com/u/0/
2. Click: "Add project" and fill out details
3. In the upper left of the page, under the "Develop" tab, click: "Database"
4. Click: "Create database"
5. Ensure that "Start in locked mode" is checked
6. Which server location doesn't matter so simply click: "Done"
7. Near the top of the page, click: "Cloud Firestore"
8. In the opened modal, click: "Realtime Database"
9. Click on the bar containing the database url and add "states" to the end,
    (it should look like `https://your_project_id.firebaseio.com/states`)
10. On the far right, click on the vertical triple dots icon
11. Click: "Import JSON"
12. Click: "Browse"
13. From this repository, select the `data/supported-states.json` file for upload.
14. In the upper left, to the right of the "Project Overview" text, click the cog icon
15. In the opened modal, click: "Project settings"
16. Click: "Service accounts"
17. Click: "Generate new private key"
18. Go to: https://www.propublica.org/datastore/api/propublica-congress-api
19. On the right, fill out the "Request an API key" form and click: "Submit"
20. Go to: https://openstates.org/api/register/
21. Fill out the "Register for an API Key" form and click: "Submit"
22. Once you have received API keys from Propublica and Open States,
    create a file at the top level of this repository called `.env`
23. Open the private key file you downloaded from firebase in step ten
24. In the `.env` file, copy and paste the details from the Firebase private key in the following format:

```
TESTING_FIREBASE_TOKEN='{your firebase private_key}'  # A long string that begins with "-----BEGIN PRIVATE KEY ..."
TESTING_PROJECT_ID='your firebase project_id'
TESTING_CLIENT_EMAIL='{your firebase client_email}'
TESTING_DATABASE_URL='https://{your firebase project_id}.firebaseio.com/'
PROPUBLICA='{your propublica api key}'  # A forty character long alphanumeric string
OPEN_STATES_API_KEY='your open states api key'  # A forty character long alphanumeric string
```

***Assuming you have [node.js](https://nodejs.org/en/) installed:***

25. Run `npm i`
26. Run `node bin/seed-federal-db-from-propublica.js`
27. Run `node openstates/get-state-lawmakers.js`
