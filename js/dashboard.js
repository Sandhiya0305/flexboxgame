/* dashboard.js — multi-page dashboard controller for Flexbox Fairy
 *
 * Responsibilities:
 *  1. Page-tab switching between Game, Progress, and Reference views.
 *  2. Stats-bar updates (current level, solved count, progress fill, mode).
 *  3. Progress page: dynamic level-map generation with solved/current markers.
 *  4. Reference page: per-property cards generated from the shared `docs` object.
 */

var dashboard = {

  /* ── Initialisation ──────────────────────────────────── */

  init: function () {
    this.initNavTabs();
    this.initProgressPage();
    this.initReferencePage();
    this.updateStats();
    this.watchSolvedChanges();
  },

  /* ── Page-tab switching ──────────────────────────────── */

  initNavTabs: function () {
    $('.nav-tab').on('click', function () {
      var page = $(this).data('page');
      dashboard.showPage(page);
    });
  },

  showPage: function (page) {
    // Update ARIA state on tabs
    $('.nav-tab').removeClass('active').attr('aria-selected', 'false');
    $('.nav-tab[data-page="' + page + '"]').addClass('active').attr('aria-selected', 'true');

    // Switch visible panel
    $('.page').removeClass('active');
    $('#page-' + page).addClass('active');

    // Refresh dynamic content when switching to data-heavy pages
    if (page === 'progress') {
      this.updateProgressPage();
    }
  },

  /* ── Stats-bar update ────────────────────────────────── */

  updateStats: function () {
    if (typeof levels === 'undefined' || typeof game === 'undefined') return;

    var total    = levels.length;
    var solved   = game.solved.length;
    var current  = game.level + 1;
    var pct      = total > 0 ? Math.round((solved / total) * 100) : 0;

    var modeLabels = { easy: 'Beginner', medium: 'Intermediate', hard: 'Expert' };
    var modeLabel  = modeLabels[game.difficulty] || 'Beginner';

    $('#stats-level-display').text(current);
    $('#stats-solved-count').text(solved);
    $('#stats-total-count').text(total);
    $('#stats-progress-fill').css('width', pct + '%');
    $('#stats-progress-track').attr('aria-valuenow', solved);
    $('#stats-mode').text(modeLabel);
  },

  /* ── Progress page ───────────────────────────────────── */

  initProgressPage: function () {
    if (typeof levels !== 'undefined') {
      this.updateProgressPage();
    }
  },

  updateProgressPage: function () {
    if (typeof levels === 'undefined' || typeof game === 'undefined') return;

    var total      = levels.length;
    var solved     = game.solved.length;
    var pct        = total > 0 ? Math.round((solved / total) * 100) : 0;
    var modeLabels = { easy: 'Beginner', medium: 'Intermediate', hard: 'Expert' };
    var modeIcons  = { easy: '🌱', medium: '⚡', hard: '🔥' };

    $('#prog-solved').text(solved);
    $('#prog-total').text(total);
    $('#prog-pct').text(pct + '%');
    $('#prog-mode').text(modeLabels[game.difficulty] || 'Beginner');
    $('#prog-mode-icon').text(modeIcons[game.difficulty] || '🌱');

    // Rebuild the level-map grid
    var $grid = $('#progress-level-grid').empty();

    levels.forEach(function (level, i) {
      var isSolved  = game.solved.indexOf(level.name) !== -1;
      var isCurrent = i === game.level;

      var $circle = $('<div class="prog-level-circle"></div>').text(i + 1);
      if (isSolved)  $circle.addClass('solved');
      if (isCurrent) $circle.addClass('current');

      var $label = $('<div class="prog-level-name"></div>').text(level.name);

      $('<div class="prog-level-item"></div>')
        .attr('title', level.name)
        .append($circle, $label)
        .on('click', function () {
          game.saveAnswer();
          game.level = i;
          game.loadLevel(level);
          dashboard.showPage('game');
        })
        .appendTo($grid);
    });
  },

  /* ── Reference page ──────────────────────────────────── */

  initReferencePage: function () {
    if (typeof docs === 'undefined') return;

    // Short plain-text descriptions for each property
    var propDesc = {
      'justify-content': 'Aligns flex items along the <strong>main axis</strong> (horizontal when <code>flex-direction: row</code>). Distributes extra free space between or around items.',
      'align-items':     'Aligns flex items along the <strong>cross axis</strong> (vertical by default) within a single flex line. Acts as the default <code>align-self</code> for all children.',
      'align-self':      'Overrides the container\'s <code>align-items</code> value for an <strong>individual flex item</strong>, letting it opt out of the shared cross-axis alignment.',
      'align-content':   'Controls spacing between <strong>multiple flex lines</strong> when <code>flex-wrap</code> is active and the container has extra space on the cross axis.',
      'flex-direction':  'Establishes the <strong>main axis</strong> and defines the direction in which flex items are placed inside the flex container.',
      'flex-wrap':       'Controls whether flex items are forced onto <strong>a single line</strong> or can wrap onto multiple lines when they overflow the container.',
      'flex-flow':       'Shorthand for <code>flex-direction</code> and <code>flex-wrap</code>, the two properties that define the flex container\'s main and cross axes.',
      'order':           'Overrides the <strong>visual rendering order</strong> of a flex item. Items with lower <code>order</code> values appear first regardless of source order.'
    };

    // Accepted values per property (authoritative subset used in this game)
    var propValues = {
      'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
      'align-items':     ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
      'align-self':      ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
      'align-content':   ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch'],
      'flex-direction':  ['row', 'row-reverse', 'column', 'column-reverse'],
      'flex-wrap':       ['nowrap', 'wrap', 'wrap-reverse'],
      'flex-flow':       ['row nowrap', 'column wrap', 'row-reverse wrap-reverse'],
      'order':           ['<integer>']
    };

    var $grid = $('#reference-grid');

    Object.keys(docs).forEach(function (prop) {
      var desc   = propDesc[prop] || '';
      var values = propValues[prop] || [];

      var $chips = $('<div class="ref-values"></div>');
      values.forEach(function (val) {
        var isPlaceholder = val.charAt(0) === '<';
        var $chip = $('<span class="ref-value-chip"></span>').text(val);

        if (!isPlaceholder) {
          // Clicking a value chip applies it to the current editor field
          $chip.on('click', function () {
            game.writeCSS(prop, val.split(' ')[0]);
            game.check();
            dashboard.showPage('game');
          });
        } else {
          $chip.css('cursor', 'default').attr('title', 'Accepts any integer value');
        }

        $chips.append($chip);
      });

      var $card = $('<div class="ref-card"></div>')
        .append($('<div class="ref-card-title"></div>').text(prop))
        .append($('<div class="ref-card-desc"></div>').html(desc))
        .append($chips);

      $grid.append($card);
    });
  },

  /* ── Reactivity: watch for solved-level mutations ────── */

  watchSolvedChanges: function () {
    var self = this;

    // MutationObserver on #levels: fires when .solved class is added to a marker
    var levelsEl = document.getElementById('levels');
    if (levelsEl && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () {
        self.updateStats();
      });
      observer.observe(levelsEl, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Also update when the difficulty or level changes
    $(document).on('change', '#difficulty', function () {
      setTimeout(function () { self.updateStats(); }, 100);
    });

    // Update stats bar whenever the level counter text changes
    var levelCounterEl = document.getElementById('level-counter');
    if (levelCounterEl && typeof MutationObserver !== 'undefined') {
      var lcObserver = new MutationObserver(function () {
        self.updateStats();
      });
      lcObserver.observe(levelCounterEl, { subtree: true, characterData: true, childList: true });
    }
  }
};

$(document).ready(function () {
  // Initialise after game.js's $(document).ready has run.
  // Both handlers are queued in the same microtask turn, so a zero-delay
  // setTimeout ensures game.start() has completed before we read game state.
  setTimeout(function () {
    dashboard.init();
  }, 0);
});
