/* =============================================================
   Excel Preview Power-Up — client.js
   Hosted on GitHub Pages: https://oonufrienko-at-breeze.github.io/trello-excel-powerup/

   FIX: Trello attachment URLs require authentication and block
   cross-origin fetch from GitHub Pages (CORS + 401).
   Solution: download the file HERE (in the Power-Up iframe context,
   which has access to t.getRestApi() token), encode it as base64,
   store it via t.set('card','private'), then open viewer.html which
   reads it back via t.get() — no direct fetch from viewer needed.
   ============================================================= */

var POWERUP_BASE_URL = 'https://oonufrienko-at-breeze.github.io/trello-excel-powerup';

/* ── helpers ── */
function isExcel(name) {
  return /\.(xlsx|xls|xlsm)$/i.test(name || '');
}

/* Convert ArrayBuffer → base64 string */
function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  var chunkSize = 8192;
  for (var i = 0; i < bytes.length; i += chunkSize) {
    var chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/*
  Download an Excel attachment using the Trello REST API token.
  t.getRestApi() gives us a token that is accepted by the Trello
  CDN for this board — no CORS issues because it's a same-session
  Power-Up iframe making the request with proper credentials.

  We try two strategies:
  1. Fetch the attachment URL directly with Authorization header
     (works for attachments stored on Trello's own CDN)
  2. Fallback: use Trello REST API endpoint
     GET /1/cards/:cardId/attachments/:attachmentId
     to get a fresh signed URL, then fetch that
*/
function downloadAttachment(t, attachmentUrl, attachmentId) {
  return t.getRestApi()
    .then(function (api) {
      return api.getToken();
    })
    .then(function (token) {
      /* Strategy 1: direct fetch with token in query string
         Trello CDN respects ?token= param for its own attachments */
      var urlWithToken = attachmentUrl +
        (attachmentUrl.indexOf('?') === -1 ? '?' : '&') +
        'token=' + encodeURIComponent(token);

      return fetch(urlWithToken, {
        method: 'GET',
        credentials: 'omit'
      }).then(function (response) {
        if (response.ok) return response.arrayBuffer();

        /* Strategy 2: go through REST API to get a fresh signed URL */
        return t.card('id').then(function (card) {
          var apiUrl = 'https://api.trello.com/1/cards/' + card.id +
            '/attachments/' + attachmentId +
            '?key=' + token + /* Note: token here acts as key for REST */
            '&token=' + token;

          return fetch(apiUrl)
            .then(function (r) { return r.json(); })
            .then(function (attData) {
              var dlUrl = (attData.url || attachmentUrl) +
                (((attData.url || attachmentUrl).indexOf('?') === -1) ? '?' : '&') +
                'token=' + encodeURIComponent(token);
              return fetch(dlUrl, { credentials: 'omit' });
            })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.arrayBuffer();
            });
        });
      });
    });
}

/*
  Store the file data and open the viewer modal.
  We use t.set with scope 'card' / visibility 'private' so the data
  is accessible to viewer.html (same Power-Up, same card context).
  Key: 'previewData' — contains { base64, name, ts }
*/
function openPreview(t, file) {
  /* Show loading state in a temporary popup while we fetch */
  return t.popup({
    title: 'Loading…',
    url: POWERUP_BASE_URL + '/loading.html',
    height: 80
  }).then(function () {
    /* Small delay to let popup render */
    return new Promise(function (resolve) { setTimeout(resolve, 50); });
  }).then(function () {
    return downloadAttachment(t, file.url, file.id);
  }).then(function (buffer) {
    var base64 = arrayBufferToBase64(buffer);
    /* Store in card-level private storage (Power-Up scope) */
    return t.set('card', 'private', 'previewData', {
      base64: base64,
      name: file.name,
      ts: Date.now()
    });
  }).then(function () {
    /* Close loading popup, open viewer modal */
    t.closePopup();
    return t.modal({
      url: POWERUP_BASE_URL + '/viewer.html?name=' + encodeURIComponent(file.name),
      accentColor: '#217346',
      height: 800,
      title: file.name
    });
  }).catch(function (err) {
    t.closePopup();
    return t.popup({
      title: 'Error',
      url: POWERUP_BASE_URL + '/error.html?msg=' + encodeURIComponent(err.message || 'Could not load file'),
      height: 120
    });
  });
}

/* ── capabilities ── */
TrelloPowerUp.initialize({

  /* ────────────────────────────────────────────────────────────
     attachment-sections
  ──────────────────────────────────────────────────────────── */
  'attachment-sections': function (t, options) {
    var claimed = (options.entries || []).filter(function (att) {
      return isExcel(att.name);
    });

    if (!claimed.length) return [];

    return [{
      id: 'excel-preview-section',
      claimed: claimed,
      icon: POWERUP_BASE_URL + '/icons/icon.svg',
      title: 'Excel Previews',
      content: {
        type: 'iframe',
        url: t.signUrl(POWERUP_BASE_URL + '/section.html'),
        height: 48 * claimed.length + 20
      }
    }];
  },

  /* ────────────────────────────────────────────────────────────
     card-buttons
  ──────────────────────────────────────────────────────────── */
  'card-buttons': function (t) {
    return t.card('attachments').then(function (card) {
      var excelFiles = (card.attachments || []).filter(function (att) {
        return isExcel(att.name);
      });

      if (!excelFiles.length) return [];

      return [{
        icon: POWERUP_BASE_URL + '/icons/icon.svg',
        text: 'Excel Preview',
        callback: function (t) {
          if (excelFiles.length === 1) {
            return openPreview(t, excelFiles[0]);
          }
          /* Multiple files — show picker */
          return t.popup({
            title: 'Choose Excel file',
            url: POWERUP_BASE_URL + '/picker.html',
            args: {
              files: excelFiles.map(function (f) {
                return { url: f.url, id: f.id, name: f.name };
              })
            },
            height: Math.min(400, excelFiles.length * 56 + 48)
          });
        }
      }];
    });
  },

  /* ────────────────────────────────────────────────────────────
     show-settings
  ──────────────────────────────────────────────────────────── */
  'show-settings': function (t) {
    return t.popup({
      title: 'Excel Preview Settings',
      url: POWERUP_BASE_URL + '/settings.html',
      height: 180
    });
  }

}, {
  /* Request REST API scope so t.getRestApi() works */
  appKey: '',  /* Trello fills this automatically from Power-Up registration */
  appName: 'Excel Preview'
});
