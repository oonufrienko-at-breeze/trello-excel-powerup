/* =============================================================
   Excel Preview Power-Up — client.js
   Hosted on GitHub Pages: https://oonufrienko-at-breeze.github.io/trello-excel-powerup/
   ============================================================= */

var POWERUP_BASE_URL = 'https://oonufrienko-at-breeze.github.io/trello-excel-powerup';

/* ── helpers ── */
function isExcel(name) {
  return /\.(xlsx|xls|xlsm)$/i.test(name || '');
}

function getViewerUrl(fileUrl, fileName) {
  return (
    POWERUP_BASE_URL +
    '/viewer.html?file=' +
    encodeURIComponent(fileUrl) +
    '&name=' +
    encodeURIComponent(fileName || 'Excel file')
  );
}

/* ── capabilities ── */
TrelloPowerUp.initialize({

  /* ────────────────────────────────────────────────────────────
     attachment-sections
     Shows a dedicated "Excel Previews" section under attachments
     with an "Open preview" button for every Excel file.
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
        url: t.signUrl(
          POWERUP_BASE_URL + '/section.html'
        ),
        height: 48 * claimed.length + 20
      }
    }];
  },

  /* ────────────────────────────────────────────────────────────
     card-buttons
     Adds a single "Excel Preview" button to the card back that
     shows a list of all Excel attachments and lets the user
     choose which one to preview.
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
          /* If only one Excel file — open it directly */
          if (excelFiles.length === 1) {
            return t.modal({
              url: getViewerUrl(excelFiles[0].url, excelFiles[0].name),
              accentColor: '#217346',
              height: 800,
              title: excelFiles[0].name
            });
          }

          /* Multiple files — show a picker popup first */
          return t.popup({
            title: 'Choose Excel file',
            url: POWERUP_BASE_URL + '/picker.html',
            args: {
              files: excelFiles.map(function (f) {
                return { url: f.url, name: f.name };
              })
            },
            height: Math.min(400, excelFiles.length * 56 + 48)
          });
        }
      }];
    });
  },

  /* ────────────────────────────────────────────────────────────
     show-settings  (optional — for future config page)
  ──────────────────────────────────────────────────────────── */
  'show-settings': function (t) {
    return t.popup({
      title: 'Excel Preview Settings',
      url: POWERUP_BASE_URL + '/settings.html',
      height: 180
    });
  }

});
