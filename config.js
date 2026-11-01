// SH1DEN'S bar settings. Firebase connection for the sh1den-bar project.
window.BAR_CONFIG = {
  firebase: {
    apiKey: "AIzaSyC2LMcOpeMAaPXdeA-YiwmcEnliKoBh4V8",
    authDomain: "sh1den-bar.firebaseapp.com",
    databaseURL: "https://sh1den-bar-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sh1den-bar",
    appId: "1:105139257150:web:23a0bdeb4f5f683f73f66f"
  },

  // Seconds between chat messages / TV links per person (the database also enforces 5 seconds).
  slowModeSeconds: 5,

  // TV queue limits.
  maxQueue: 25,
  maxQueuePerUser: 3,

  // Words to hide in chat (replaced with ***). Add your own, lowercase.
  blockedWords: [],

  // Coins spent in total before someone can use the VIP lounge.
  vipAfterSpending: 1000,

  // The hotel floor upstairs. While false, only sh1denfps can go up (everyone else sees "under construction").
  // Set to true when it's ready to open to everyone.
  hotelOpen: false
};
