/* =============================================================
   Excel Preview Power-Up — client.js
   Architecture:
   1. On init, connector fetches the REST API token and caches it
      in Power-Up storage (board/private/authToken) so section
      iframes can retrieve it without calling t.getRestApi()
   2. attachment-sections: shows Excel file list in section.html
   3. card-buttons: fallback to open preview directly
   ============================================================= */
var POWERUP_BASE_URL = 'https://oonufrienko-at-breeze.github.io/trello-excel-powerup';
var APP_KEY = 'eaa6d0d7c57218139af1b772bbd777cb';

function isExcel(name) {
  return /\.(xlsx|xls|xlsm)$/i.test(name || '');
}

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

/* Get token — first try cache, then REST API */
function getToken(t) {
  return t.get('board', 'private', 'authToken').then(function (cached) {
    if (cached) return cached;
    return t.getRestApi().then(function (api) {
      return api.isAuthorized().then(function (authorized) {
        if (!authorized) {
          return api.authorize({ scope: 'read' }).then(function () {
            return api.getToken();
          });
        }
        return api.getToken();
      });
    }).then(function (token) {
      if (token) {
        // Cache for 24h
        return t.set('board', 'private', 'authToken', token).then(function () {
          return token;
        });
      }
      return token;
    });
  });
}

function downloadAttachment(t, file) {
  return getToken(t).then(function (token) {
    var url = file.url;
    url = url.replace('https://trello.com/1/', 'https://api.trello.com/1/');
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var fetchUrl = url + sep + 'token=' + encodeURIComponent(token) + '&key=' + APP_KEY;
    return fetch(fetchUrl, { credentials: 'omit' }).then(function (res) {
      if (res.ok) return res.arrayBuffer();
      // Fallback: get fresh URL from REST API
      return t.card('id').then(function (card) {
        var apiUrl = 'https://api.trello.com/1/cards/' + card.id +
          '/attachments/' + file.id +
          '?key=' + APP_KEY + '&token=' + encodeURIComponent(token);
        return fetch(apiUrl).then(function (r) { return r.json(); }).then(function (att) {
          var dlUrl = (att.url || file.url);
          var sep2 = dlUrl.indexOf('?') >= 0 ? '&' : '?';
          return fetch(dlUrl + sep2 + 'token=' + encodeURIComponent(token), { credentials: 'omit' });
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        });
      });
    });
  });
}

function openPreview(t, file) {
  return t.popup({
    title: 'Loading…',
    url: POWERUP_BASE_URL + '/loading.html',
    height: 80
  }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, 50); });
  }).then(function () {
    return downloadAttachment(t, file);
  }).then(function (buffer) {
    var base64 = arrayBufferToBase64(buffer);
    return t.set('card', 'private', 'previewData', {
      base64: base64,
      name: file.name,
      ts: Date.now()
    });
  }).then(function () {
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

TrelloPowerUp.initialize({
  'attachment-sections': function (t, options) {
    var claimed = (options.entries || []).filter(function (att) {
      return isExcel(att.name);
    });
    if (!claimed.length) return [];
    /* Pre-cache the token so section.html can read it */
    getToken(t).catch(function () {});
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

  'show-settings': function (t) {
    return t.popup({
      title: 'Excel Preview Settings',
      url: POWERUP_BASE_URL + '/settings.html',
      height: 180
    });
  }
}, {
  appKey: APP_KEY,
  appName: 'Excel Preview'
});
