var POWERUP_BASE_URL = 'https://oonufrienko-at-breeze.github.io/trello-excel-powerup';
var APP_KEY = 'eaa6d0d7c57218139af1b772bbd777cb';
var HARDCODED_TOKEN = 'ATTA9039c83a92e37752f96365207f630de0043d0118062a2e9f6588d95e6fe8ce8b52C04FF8';

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

function downloadAttachment(t, file, token) {
  var url = file.url;
  url = url.replace('https://trello.com/1/', 'https://api.trello.com/1/');
  var sep = url.indexOf('?') >= 0 ? '&' : '?';
  var fetchUrl = url + sep + 'token=' + encodeURIComponent(token) + '&key=' + APP_KEY;
  return fetch(fetchUrl, { credentials: 'omit' }).then(function (res) {
    if (res.ok) return res.arrayBuffer();
    return t.card('id').then(function (card) {
      var apiUrl = 'https://api.trello.com/1/cards/' + card.id +
        '/attachments/' + file.id +
        '?key=' + APP_KEY + '&token=' + encodeURIComponent(token);
      return fetch(apiUrl).then(function (r) { return r.json(); }).then(function (att) {
        var dlUrl = att.url || file.url;
        var sep2 = dlUrl.indexOf('?') >= 0 ? '&' : '?';
        return fetch(dlUrl + sep2 + 'token=' + encodeURIComponent(token), { credentials: 'omit' });
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      });
    });
  });
}

function openPreview(t, file) {
  return t.popup({
    title: 'Loading...',
    url: POWERUP_BASE_URL + '/loading.html',
    height: 80
  }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, 50); });
  }).then(function () {
    return downloadAttachment(t, file, HARDCODED_TOKEN);
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
    var filesJson = encodeURIComponent(JSON.stringify(claimed.map(function (f) {
      return { id: f.id, name: f.name, url: f.url };
    })));
    return [{
      id: 'excel-preview-section',
      claimed: claimed,
      icon: POWERUP_BASE_URL + '/icons/icon.svg',
      title: 'Excel Previews',
      content: {
        type: 'iframe',
        url: t.signUrl(POWERUP_BASE_URL + '/section.html')
          + '&auth=' + encodeURIComponent(HARDCODED_TOKEN)
          + '&files=' + filesJson,
        height: 80 * claimed.length + 30
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
