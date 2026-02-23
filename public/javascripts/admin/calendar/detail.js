/**
 * Detail page: one user's events as a month calendar grid (like Google Calendar). Prev/next month.
 */
(function() {
  if ($('#monthLabel').length === 0) return;

  var baseUrl = $('#base_url').val() || '';
  var userEmail = ($('#detail_email').val() || getQueryParam('email') || '').trim();

  function getQueryParam(name) {
    var u = window.location.search.substring(1).split('&');
    for (var i = 0; i < u.length; i++) {
      var p = u[i].split('=');
      if (p[0] === name) return decodeURIComponent(p[1] || '');
    }
    return '';
  }

  var currentYear = new Date().getFullYear();
  var currentMonth = new Date().getMonth() + 1;

  function getMonthLabel() {
    var d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function formatTime(str) {
    if (!str) return '';
    if (str.length <= 10) return 'All day';
    try {
      var d = new Date(str);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return str; }
  }

  function dateKey(str) {
    if (!str || str.length < 10) return '';
    return str.substring(0, 10);
  }

  /** Build a 42-cell calendar (6 weeks x 7 days). Each cell is day number or empty, plus events keyed by date. */
  function buildCalendarGrid(eventsByDate) {
    var y = currentYear;
    var m = currentMonth - 1;
    var first = new Date(y, m, 1);
    var last = new Date(y, m + 1, 0);
    var firstDayOfWeek = first.getDay();
    var lastDay = last.getDate();
    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var cells = [];
    var i;
    for (i = 0; i < firstDayOfWeek; i++) cells.push({ day: null });
    for (i = 1; i <= lastDay; i++) cells.push({ day: i, key: y + '-' + String(m + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0') });
    while (cells.length < 42) cells.push({ day: null });

    var html = '<table class="table table-bordered mb-0"><thead><tr>';
    dayNames.forEach(function(name) { html += '<th>' + name + '</th>'; });
    html += '</tr></thead><tbody>';
    for (var row = 0; row < 6; row++) {
      html += '<tr>';
      for (var col = 0; col < 7; col++) {
        var cell = cells[row * 7 + col];
        var cls = cell.day === null ? 'empty' : '';
        html += '<td class="' + cls + '" data-date="' + (cell.key || '') + '">';
        if (cell.day !== null) {
          html += '<div class="day-num">' + cell.day + '</div>';
          var events = (eventsByDate[cell.key] || []);
          if (events.length > 0) {
            html += '<ul class="day-events">';
            events.forEach(function(ev) {
              var timeStr = ev.allDay ? 'All day' : (formatTime(ev.start) + ' ');
              var clsEv = ev.allDay ? 'all-day' : '';
              html += '<li class="' + clsEv + '" title="' + (ev.summary || '').replace(/"/g, '&quot;') + '">' + timeStr + (ev.summary || '(No title)') + '</li>';
            });
            html += '</ul>';
          }
        }
        html += '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function loadMonthEvents() {
    if (!userEmail) {
      $('#monthPlaceholder').hide();
      $('#monthContainer').hide();
      $('#monthError').text('No user email specified.').show();
      return;
    }
    $('#monthPlaceholder').show();
    $('#monthError').hide();
    $('#monthContainer').hide();
    if (typeof window.showGlobalLoader === 'function') window.showGlobalLoader();

    $.ajax({
      url: baseUrl + '/admin/calendar/events-month',
      type: 'GET',
      data: { email: userEmail, year: currentYear, month: currentMonth },
      dataType: 'json',
      complete: function() {
        $('#monthPlaceholder').hide();
        if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
      },
      success: function(res) {
        if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
        try {
          if (res.status !== 'success') {
            $('#monthError').text(res.message || 'Failed to load events').show();
            $('#monthContainer').hide();
            return;
          }
          $('#monthError').hide();
          $('#monthLabel').text(getMonthLabel());
          updateMonthYearDropdowns();
          var events = res.data || [];
          var eventsByDate = {};
          events.forEach(function(ev) {
            var key = dateKey(ev.start);
            if (!eventsByDate[key]) eventsByDate[key] = [];
            eventsByDate[key].push(ev);
          });
          $('#calendarGrid').html(buildCalendarGrid(eventsByDate));
          $('#monthContainer').show();
        } catch (err) {
          $('#monthError').text('Failed to display calendar.').show();
          $('#monthContainer').hide();
        }
      },
      error: function(xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Failed to load events';
        $('#monthError').text(msg).show();
        $('#monthContainer').hide();
      }
    });
  }

  function updateMonthYearDropdowns() {
    var $monthSel = $('#detailMonthSelect');
    var $yearSel = $('#detailYearSelect');
    if ($monthSel.length) $monthSel.val(currentMonth);
    if ($yearSel.length) $yearSel.val(currentYear);
  }

  $('#backToListLink').attr('href', baseUrl + '/admin/calendar/page');

  $('#prevMonthBtn').on('click', function() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    loadMonthEvents();
  });

  $('#nextMonthBtn').on('click', function() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    loadMonthEvents();
  });

  $(document).on('change', '#detailMonthSelect', function() {
    var v = parseInt($(this).val(), 10);
    if (v >= 1 && v <= 12) { currentMonth = v; loadMonthEvents(); }
  });

  $(document).on('change', '#detailYearSelect', function() {
    var v = parseInt($(this).val(), 10);
    if (!isNaN(v)) { currentYear = v; loadMonthEvents(); }
  });

  loadMonthEvents();
})();
