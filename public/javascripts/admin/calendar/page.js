/**
 * Main calendar page: configured users (from XML) with time-wise events for selected date.
 * Scrollable list. Click user email to open detail (month view).
 */
(function() {
  if ($('#dateSelect').length === 0) return;

  var baseUrl = $('#base_url').val() || '';

  // Time slots (start/end minutes from midnight) loaded from config/slot-config.xml via window.CALENDAR_TIME_SLOTS.
  // Fallback to 00:00–23:59 with 60-minute slots if not defined.
  var TIME_SLOTS = (window.CALENDAR_TIME_SLOTS && window.CALENDAR_TIME_SLOTS.length)
    ? window.CALENDAR_TIME_SLOTS
    : (function() {
        var slots = [];
        for (var m = 0; m < 24 * 60; m += 60) {
          slots.push({ startMinutes: m, endMinutes: Math.min(m + 60, 24 * 60) });
        }
        return slots;
      })();

  function getSelectedDate() {
    var val = $('#dateSelect').val() || '';
    if (val.length >= 10) return val.substring(0, 10);
    return val;
  }

  function setSelectedDate(yyyyMmDd) {
    $('#dateSelect').val(yyyyMmDd);
    try {
      $('#dateSelect').datepicker('setDate', yyyyMmDd);
    } catch (e) {}
  }

  function formatDateLabel(str) {
    if (!str || str.length < 10) return str;
    var d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatTime(str) {
    if (!str) return '—';
    if (str.length <= 10) return 'All day';
    try {
      var d = new Date(str);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return str; }
  }

  function eventOverlapsSlot(ev, slot) {
    if (!ev) return false;
    if (ev.allDay) return true;
    if (!ev.start || !ev.end) return false;
    try {
      var s = new Date(ev.start);
      var e = new Date(ev.end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
      var startMin = s.getHours() * 60 + s.getMinutes();
      var endMin = e.getHours() * 60 + e.getMinutes();
      var slotStart = slot.startMinutes;
      var slotEnd = slot.endMinutes;
      return startMin < slotEnd && endMin > slotStart;
    } catch (err) {
      return false;
    }
  }

  function formatMinutesLabel(mins) {
    if (typeof mins !== 'number') return '';
    if (mins < 0) mins = 0;
    if (mins > 24 * 60) mins = 24 * 60;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h === 24) h = 0;
    var suffix = h >= 12 ? 'pm' : 'am';
    var displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;
    var mm = String(m).padStart(2, '0');
    return displayHour + ':' + mm + ' ' + suffix;
  }

  function buildBusyAndFree(events) {
    var busyLines = [];
    var intervals = [];

    (events || []).forEach(function(ev) {
      if (!ev) return;
      var timeStr;
      if (ev.allDay) {
        timeStr = 'All day';
        intervals.push({ start: 0, end: 24 * 60 });
      } else if (ev.start && ev.end) {
        timeStr = formatTime(ev.start) + ' – ' + formatTime(ev.end);
        try {
          var s = new Date(ev.start);
          var e = new Date(ev.end);
          if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
            var startMin = s.getHours() * 60 + s.getMinutes();
            var endMin = e.getHours() * 60 + e.getMinutes();
            intervals.push({ start: startMin, end: endMin });
          }
        } catch (e) {}
      } else {
        timeStr = '';
      }
      var creator = ev.creator ? ('created by ' + ev.creator) : '';
      var label = (ev.summary || '(No title)');
      busyLines.push((timeStr ? (timeStr + ' ') : '') + label + (creator ? (' – ' + creator) : ''));
    });

    // Free slots: based on TIME_SLOTS where no event overlaps.
    var freeLabels = [];
    TIME_SLOTS.forEach(function(slot) {
      var hasBusy = (events || []).some(function(ev) { return eventOverlapsSlot(ev, slot); });
      if (!hasBusy) {
        if (slot.label) {
          freeLabels.push(slot.label);
        } else {
          freeLabels.push(formatMinutesLabel(slot.startMinutes) + ' – ' + formatMinutesLabel(slot.endMinutes));
        }
      }
    });

    return {
      busyText: busyLines.length ? busyLines.join('<br>') : 'No events',
      freeText: freeLabels.length ? freeLabels.join(', ') : 'No free slots'
    };
  }

  function loadEventsForDate() {
    var date = getSelectedDate();
    if (!date) {
      $('#eventsPlaceholder').show();
      $('#eventsContainer').hide();
      $('#eventsError').hide();
      return;
    }
    $('#eventsPlaceholder').hide();
    $('#eventsLoading').show();
    $('#eventsContainer').hide();
    $('#eventsError').hide();
    if (typeof window.showGlobalLoader === 'function') window.showGlobalLoader();

    $.ajax({
      url: baseUrl + '/admin/calendar/events-by-date',
      type: 'GET',
      data: { date: date },
      dataType: 'json',
      complete: function() {
        $('#eventsLoading').hide();
        if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
      },
      success: function(res) {
        if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
        if (res.status !== 'success') {
          $('#eventsError').text(res.message || 'Failed to load events').show();
          return;
        }
        $('#eventsError').hide();
        var list = res.data || [];
        $('#eventsDateLabel').text(formatDateLabel(date));
        var tbody = $('#eventsTableBody');
        var summaryBody = $('#summaryTableBody');
        var mobileList = $('#mobileList');
        tbody.empty();
        summaryBody.empty();
        mobileList.empty();

        var colCount = 3 + TIME_SLOTS.length; // Sr No + Name + Email + slots

        if (list.length === 0) {
          tbody.append('<tr><td colspan="' + colCount + '" class="text-muted">No configured users in config/users.xml.</td></tr>');
          mobileList.append('<div class="text-muted">No configured users in config/users.xml.</div>');
        } else {
          list.forEach(function(item, index) {
            var email = item.email || '';
            var name = item.name || '';
            var events = item.events || [];
            var error = item.error;

            var rowHtml = '<tr>';
            rowHtml += '<td class="calendar-col-sr">' + (index + 1) + '</td>';
            rowHtml += '<td class="calendar-col-name">' + (name || '—') + '</td>';

            if (email) {
              rowHtml += '<td class="calendar-col-email"><a href="' + baseUrl + '/admin/calendar/detail?email=' + encodeURIComponent(email) + '">' + email + '</a></td>';
            } else {
              rowHtml += '<td class="calendar-col-email">—</td>';
            }

            if (error) {
              rowHtml += '<td colspan="' + TIME_SLOTS.length + '" class="text-danger">' + error + '</td>';
              rowHtml += '</tr>';
              tbody.append(rowHtml);

              var summaryRow = '<tr>';
              summaryRow += '<td class="calendar-col-sr">' + (index + 1) + '</td>';
              summaryRow += '<td class="calendar-col-name">' + (name || '—') + '</td>';
              summaryRow += '<td class="calendar-col-email">' + (email || '—') + '</td>';
              summaryRow += '<td colspan="2" class="text-danger">' + error + '</td>';
              summaryRow += '</tr>';
              summaryBody.append(summaryRow);

              // Mobile card with error
              var cardError = '<div class="card mb-2">';
              cardError += '<div class="card-header p-2">';
              cardError += '<div><strong>' + (name || email || '—') + '</strong></div>';
              cardError += '<div class="small text-muted">' + (email || '—') + '</div>';
              cardError += '</div>';
              cardError += '<div class="card-body p-2"><div class="text-danger small">' + error + '</div></div>';
              cardError += '</div>';
              mobileList.append(cardError);
              return;
            }

            TIME_SLOTS.forEach(function(slot) {
              var slotEvents = [];
              events.forEach(function(ev) {
                if (eventOverlapsSlot(ev, slot)) {
                  var timeStr = ev.allDay ? 'All day' : (formatTime(ev.start) + ' – ' + formatTime(ev.end));
                  var label = (ev.summary || '(No title)');
                  slotEvents.push(timeStr + ' ' + label);
                }
              });
              if (slotEvents.length === 0) {
                rowHtml += '<td></td>';
              } else {
                rowHtml += '<td>' + slotEvents.join('<br>') + '</td>';
              }
            });

            rowHtml += '</tr>';
            tbody.append(rowHtml);

            var bf = buildBusyAndFree(events);
            var summaryRowOk = '<tr>';
            summaryRowOk += '<td class="calendar-col-sr">' + (index + 1) + '</td>';
            summaryRowOk += '<td class="calendar-col-name">' + (name || '—') + '</td>';
            summaryRowOk += '<td class="calendar-col-email">' + (email || '—') + '</td>';
            summaryRowOk += '<td>' + bf.busyText + '</td>';
            summaryRowOk += '<td>' + bf.freeText + '</td>';
            summaryRowOk += '</tr>';
            summaryBody.append(summaryRowOk);

            // Mobile accordion card with busy events list only
            var cardId = 'mobileUserBody' + index;
            var headerId = 'mobileUserHeader' + index;
            var card = '<div class="card mb-2">';
            card += '<div class="card-header p-2" id="' + headerId + '">';
            // Make only the name/email area toggle the collapse, not the whole card body.
            card += '<button class="btn btn-link text-left p-0 mobile-card-toggle" type="button" data-toggle="collapse" data-target="#' + cardId + '" aria-expanded="false" aria-controls="' + cardId + '">';
            card += '<div><strong>' + (name || email || '—') + '</strong></div>';
            card += '<div class="small text-muted">' + (email || '—') + '</div>';
            card += '</button>';
            card += '</div>';
            card += '<div id="' + cardId + '" class="collapse" aria-labelledby="' + headerId + '">';
            card += '<div class="card-body p-2">';

            if (!events || events.length === 0) {
              card += '<div class="text-muted small mb-2">No events</div>';
            } else {
              card += '<ul class="list-unstyled mb-2">';
              events.forEach(function(ev) {
                var timeStr;
                if (ev.allDay) {
                  timeStr = 'All day';
                } else if (ev.start && ev.end) {
                  timeStr = formatTime(ev.start) + ' – ' + formatTime(ev.end);
                } else {
                  timeStr = '';
                }
                var creator = ev.creator ? ('created by ' + ev.creator) : '';
                var label = (ev.summary || '(No title)');
                card += '<li class="mb-1">';
                if (timeStr) {
                  card += '<div><strong>' + timeStr + '</strong></div>';
                }
                card += '<div>' + label + '</div>';
                if (creator) {
                  card += '<div class="small text-muted">' + creator + '</div>';
                }
                card += '</li>';
              });
              card += '</ul>';
            }

            if (email) {
              card += '<a href="' + baseUrl + '/admin/calendar/detail?email=' + encodeURIComponent(email) + '" class="small">View month</a>';
            }

            card += '</div></div></div>';
            mobileList.append(card);
          });
        }
        $('#eventsContainer').show();
      },
      error: function(xhr) {
        var msg = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Failed to load events';
        $('#eventsError').text(msg).show();
      }
    });
  }

  function goPrevDay() {
    var d = getSelectedDate();
    if (!d) return;
    var date = new Date(d + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    var str = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    setSelectedDate(str);
    loadEventsForDate();
  }

  function goNextDay() {
    var d = getSelectedDate();
    if (!d) return;
    var date = new Date(d + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    var str = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    setSelectedDate(str);
    loadEventsForDate();
  }

  $('#dateSelect').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true
  });

  $('#dateSelect').on('changeDate', function() {
    var d = $(this).datepicker('getDate');
    if (d) {
      var str = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      $('#dateSelect').val(str);
      loadEventsForDate();
    }
  });

  $('#dateSelect').on('change', function() {
    var str = $('#dateSelect').val() || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) loadEventsForDate();
  });

  $('#prevDayBtn').on('click', goPrevDay);
  $('#nextDayBtn').on('click', goNextDay);

  $('#viewSlotsBtn').on('click', function() {
    $('#viewSlotsBtn').addClass('btn-primary').removeClass('btn-outline-secondary');
    $('#viewSummaryBtn').removeClass('btn-primary').addClass('btn-outline-secondary');
    $('#slotView').show();
    $('#summaryView').hide();
  });

  $('#viewSummaryBtn').on('click', function() {
    $('#viewSummaryBtn').addClass('btn-primary').removeClass('btn-outline-secondary');
    $('#viewSlotsBtn').removeClass('btn-primary').addClass('btn-outline-secondary');
    $('#slotView').hide();
    $('#summaryView').show();
  });

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  setSelectedDate(todayStr);
  loadEventsForDate();
})();
