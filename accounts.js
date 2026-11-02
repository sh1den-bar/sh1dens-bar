// ================================================================ ACCOUNTS: email + password, or Google
// Everyone starts as a guest (an anonymous Firebase login tied to this browser). Making an account LINKS that guest,
// so the same player id keeps its character, coins, job, car and admin rights. Logging in on another device
// (or the phone version) switches to that account. Needs Email/Password and Google turned on in the Firebase console.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const toast = (t) => (window.BAR && window.BAR.toast ? window.BAR.toast(t) : alert(t));
  const auth = () => (window.firebase && firebase.apps && firebase.apps.length ? firebase.auth() : null);
  const user = () => { const a = auth(); return a ? a.currentUser : null; };
  const isGuest = () => { const u = user(); return !u || u.isAnonymous; };
  const label = () => { const u = user(); if (!u) return 'offline'; if (u.isAnonymous) return 'guest'; return u.email || (u.providerData[0] && u.providerData[0].email) || 'signed in'; };

  function nice(e) {
    const c = (e && e.code) || '';
    const M = {
      'auth/email-already-in-use': 'That email already has an account. Use "Log in" instead.',
      'auth/credential-already-in-use': 'That Google account already has a player. Use "Log in" instead.',
      'auth/invalid-email': "That doesn't look like an email address.",
      'auth/weak-password': 'Pick a longer password (at least 6 characters).',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/invalid-login-credentials': 'Wrong email or password.',
      'auth/user-not-found': 'No account with that email.',
      'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
      'auth/popup-closed-by-user': 'The Google window was closed before finishing.',
      'auth/operation-not-allowed': 'This kind of login isn\'t switched on yet. The host has to enable it in Firebase.',
      'auth/unauthorized-domain': 'Google login isn\'t allowed on this website yet. The host has to add the domain in Firebase.',
      'auth/network-request-failed': 'No connection. Try again.',
      'auth/requires-recent-login': 'Log in again first, then try that.'
    };
    return M[c] || ('Something went wrong (' + (c || 'error') + ').');
  }

  // ---------------------------------------------------------------- the panel
  let panel = null, mode = 'signup';
  function build() {
    panel = document.createElement('section');
    panel.className = 'panel'; panel.id = 'acctPanel'; panel.hidden = true; panel.setAttribute('aria-label', 'Account');
    panel.innerHTML =
      '<header><h2>Account</h2><button class="x" type="button" id="acctClose" aria-label="Close">✕</button></header>' +
      '<div id="acctState"></div>' +
      '<div id="acctForms">' +
      '  <div class="acctTabs"><button type="button" data-m="signup">Make an account</button><button type="button" data-m="login">Log in</button></div>' +
      '  <p id="acctBlurb"></p>' +
      '  <button type="button" id="acctGoogle" class="acctGoogle"><span class="g">G</span> <span id="acctGoogleTxt">Continue with Google</span></button>' +
      '  <div class="acctOr">or with email</div>' +
      '  <label>Email<input id="acctEmail" type="email" autocomplete="email" maxlength="120"></label>' +
      '  <label>Password<input id="acctPw" type="password" autocomplete="new-password" maxlength="80"></label>' +
      '  <div class="row"><button type="button" class="primary" id="acctGo">Make my account</button><button type="button" id="acctForgot" class="mini">Forgot password?</button></div>' +
      '</div>' +
      '<p id="acctMsg" class="acctMsg" hidden></p>';
    $('stage').appendChild(panel);
    $('acctClose').onclick = () => { panel.hidden = true; };
    for (const b of panel.querySelectorAll('.acctTabs button')) b.onclick = () => { mode = b.dataset.m; render(); };
    $('acctGo').onclick = goEmail;
    $('acctGoogle').onclick = goGoogle;
    $('acctForgot').onclick = forgot;
    $('acctPw').addEventListener('keydown', (e) => { if (e.key === 'Enter') goEmail(); });
  }
  function msg(t, bad) { const m = $('acctMsg'); m.hidden = !t; m.textContent = t || ''; m.classList.toggle('bad', !!bad); }
  function render() {
    if (!panel) return;
    const u = user(), g = isGuest();
    const st = $('acctState');
    if (!u) {
      st.innerHTML = '<p>The game is offline right now, so accounts are unavailable.</p>';
      $('acctForms').hidden = true; return;
    }
    if (g) {
      st.innerHTML = '<div class="acctCard guest"><b>Playing as a guest</b><span>Your character, coins and job live in <i>this browser only</i>. Clear it or switch devices and they\'re gone.</span></div>';
      $('acctForms').hidden = false;
    } else {
      const prov = u.providerData.map((p) => (p.providerId === 'google.com' ? 'Google' : 'email')).join(' + ');
      st.innerHTML = '<div class="acctCard ok"><b>' + esc(label()) + '</b><span>Signed in with ' + prov + '. Log in with this on any computer or on your phone and you\'re the same player.</span></div>' +
        '<div class="row"><button type="button" id="acctOut">Log out</button></div>';
      $('acctOut').onclick = logout;
      $('acctForms').hidden = true;
    }
    for (const b of panel.querySelectorAll('.acctTabs button')) b.classList.toggle('on', b.dataset.m === mode);
    $('acctBlurb').textContent = mode === 'signup'
      ? 'Keeps everything you have now: character, coins, job, car. Then log in anywhere, including the phone version.'
      : 'Already made an account somewhere else? Log in here. (Whatever this guest had in this browser stays behind.)';
    $('acctGo').textContent = mode === 'signup' ? 'Make my account' : 'Log in';
    $('acctGoogleTxt').textContent = mode === 'signup' ? 'Make it with Google' : 'Log in with Google';
    $('acctPw').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    $('acctForgot').hidden = mode !== 'login';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function refreshButton() {
    const b = $('acctBtn'); if (!b) return;
    b.textContent = isGuest() ? '👤 Account · guest (save progress)' : '👤 Account · ' + label();
    b.classList.toggle('nudge', isGuest() && !!user());
  }
  function open(m) { if (!panel) build(); if (m) mode = m; msg(''); render(); panel.hidden = false; }

  // ---------------------------------------------------------------- actions
  async function goEmail() {
    const a = auth(), u = user(); if (!a || !u) return;
    const email = $('acctEmail').value.trim(), pw = $('acctPw').value;
    if (!email || !pw) { msg('Fill in your email and a password.', true); return; }
    msg('One moment…');
    try {
      if (mode === 'signup') {
        const cred = firebase.auth.EmailAuthProvider.credential(email, pw);
        await u.linkWithCredential(cred);
        try { await u.sendEmailVerification(); } catch (e) { }
        done('Account made. Everything you had is now saved to ' + email + '.');
      } else {
        await a.signInWithEmailAndPassword(email, pw);
        switched();
      }
    } catch (e) { msg(nice(e), true); }
  }
  async function goGoogle() {
    const a = auth(), u = user(); if (!a || !u) return;
    const prov = new firebase.auth.GoogleAuthProvider();
    msg('Opening Google…');
    try {
      if (mode === 'signup' && u.isAnonymous) {
        try { await u.linkWithPopup(prov); }
        catch (e) {
          if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await u.linkWithRedirect(prov); return; }
          throw e;
        }
        done('Account made with Google. Everything you had is saved to it.');
      } else {
        try { await a.signInWithPopup(prov); }
        catch (e) {
          if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await a.signInWithRedirect(prov); return; }
          throw e;
        }
        if (user() && user().uid !== window.NET.uid) switched(); else done('Logged in.');
      }
    } catch (e) { msg(nice(e), true); }
  }
  async function forgot() {
    const a = auth(); const email = $('acctEmail').value.trim();
    if (!email) { msg('Type your email above first.', true); return; }
    try { await a.sendPasswordResetEmail(email); msg('Sent. Check your inbox (and spam) for the reset link.'); } catch (e) { msg(nice(e), true); }
  }
  async function logout() {
    const a = auth(); if (!a) return;
    // the guest you become next has nothing, so forget this browser's copies of the old player
    try { for (const k of ['sh1den-bar-me', 'sh1den-career', 'sh1den-bar-smoke']) localStorage.removeItem(k); } catch (e) { }
    await a.signOut();
    location.reload();
  }
  function done(t) { msg(t); render(); refreshButton(); if (window.NET && window.NET.onAccount) window.NET.onAccount(); }
  function switched() {
    // a different player id: start the page fresh as that player
    try { for (const k of ['sh1den-bar-me', 'sh1den-career', 'sh1den-bar-smoke']) localStorage.removeItem(k); } catch (e) { }
    msg('Logged in. Loading your player…');
    setTimeout(() => location.reload(), 400);
  }

  // ---------------------------------------------------------------- wiring
  function wire() {
    const menu = $('meMenu');
    if (menu && !$('acctBtn')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'acctBtn';
      b.onclick = () => { menu.hidden = true; open(); };
      menu.insertBefore(b, menu.firstChild);
    }
    refreshButton();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.ACCOUNT = { open, changed() { refreshButton(); render(); }, isGuest, label, user };
})();
