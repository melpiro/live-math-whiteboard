// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    projectId: 'math-board-cae64',
    appId: '1:583599596191:web:2f8e08b1a969ce8105b8aa',
    databaseURL: 'https://math-board-cae64-default-rtdb.europe-west1.firebasedatabase.app',
    storageBucket: 'math-board-cae64.appspot.com',
    apiKey: 'AIzaSyAakFUw4yvJLL3F5CVSeTnpPplp1jfA7Rw',
    authDomain: 'math-board-cae64.firebaseapp.com',
    messagingSenderId: '583599596191',
    measurementId: 'G-QMRRZXEB3C',
  },
  socket: {
    url: 'http://localhost:3000',
    options: {}
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
