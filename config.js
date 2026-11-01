// SH1DEN'S bar settings. Firebase connection for the sh1den-bar project.
window.BAR_CONFIG = {
  firebase: {
    apiKey: "AIzaSyC2LMcOpeMAaPXdeA-YiwmcEnliKoBh4V8",
    authDomain: "sh1den-bar.firebaseapp.com",
    databaseURL: "https://sh1den-bar-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sh1den-bar",
    appId: "1:105139257150:web:23a0bdeb4f5f683f73f66f"
  },

  // Seconds between chat messages / TV links per person (the database also enforces 3 seconds).
  slowModeSeconds: 3,

  // TV queue limits.
  maxQueue: 25,
  maxQueuePerUser: 3,

  // Words to hide in chat (replaced with ***). Add your own, lowercase.
  blockedWords: [],

  // What gold coins can buy. Change names and prices freely (keep each cost 10 or more).
  rewards: [
    { id: 'song', name: 'Pick the next jukebox song', cost: 10 },
    { id: 'shout', name: 'Shoutout on stream', cost: 20 },
    { id: 'video', name: 'Choose the next TV video', cost: 25 },
    { id: 'shot', name: 'Make sh1den take a shot', cost: 60 },
    { id: 'vip', name: 'VIP pass for 10 minutes', cost: 100 }
  ]
};
