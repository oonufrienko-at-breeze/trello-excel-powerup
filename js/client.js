// =============================================================
// Trello Excel Preview Power-Up — Main Entry Point
// =============================================================

var BASE = 'https://oonufrienko-at-breeze.github.io/trello-excel-powerup';
var PROXY = 'https://trello-excel-viewer.vercel.app';
var APP_KEY = 'eaa6d0d7c57218139af1b772bbd777cb';

var EXCEL_EXTS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];

var GRAY_ICON = BASE + '/icons/icon.svg';

function isExcel(att) {
  var name = (att.name || att.url || '').toLowerCase();
  return EXCEL_EXTS.some(function(ext) { return name.endsWith(ext); });
}

// ── Get Trello REST API token (asks user if not yet authorized) ──
function getToken(t) {
  return t.getRestApi().getToken().then(function(token) {
    if (token) return token;
    return t.getRestApi().authorize({ scope: 'read' }).then(function() {
      return t.getRestApi().getToken();
    });
  }).catch(function() {
    // Fallback — token not available, proxy will try without it
    return '';
  });
}

// ── Open modal with Excel viewer ──
function openModal(t, att, token, cardId) {
  return t.modal({
    url: BASE + '/viewer.html',
    args: {
      url:    att.url,
      name:   att.name,
      id:     att.id,
      cardId: cardId || '',
      token:  token || '',
      proxy:  PROXY
    },
    fullscreen: true,
    title: '\uD83D\uDCCA ' + att.name,
    accentColor: '#1D6F42'
  });
}

// ── Initialize Power-Up ──
TrelloPowerUp.initialize({

  // ── Attachment Sections: "Excel Preview" block on card back ──
  'attachment-sections': function(t, options) {
    var claimed = (options.entries || []).filter(isExcel);
    if (!claimed.length) return [];

    return [{
      id: 'excel-preview-section',
      claimed: claimed,
      icon: GRAY_ICON,
      title: 'Excel Preview',
      content: {
        type: 'iframe',
        url: t.signUrl(BASE + '/section.html'),
        height: Math.min(44 * claimed.length + 16, 300)
      }
    }];
  },

  // ── Card Button: "Excel Preview" on card back header ──
  'card-buttons': function(t) {
    return t.card('id', 'attachments').then(function(card) {
      var cardId = card.id;
      var files = (card.attachments || []).filter(isExcel);
      if (!files.length) return [];

      return [{
        icon: GRAY_ICON,
        text: 'Excel Preview',
        condition: 'always',
        callback: function(t) {
          if (files.length === 1) {
            return getToken(t).then(function(token) {
              return openModal(t, files[0], token, cardId);
            });
          }
          // Multiple files — show picker popup
          var items = files.map(function(f) {
            return {
              text: f.name,
              callback: function(t) {
                return getToken(t).then(function(token) {
                  return openModal(t, f, token, cardId);
                });
              }
            };
          });
          return t.popup({
            title: 'Оберіть Excel файл',
            items: items
          });
        }
      }];
    });
  }

}, {
  appKey: APP_KEY,
  appName: 'Excel Preview'
});
