/**
 * Calendar page - employee select, date picker, events list, prev/next day.
 * AJAX to web routes only: /admin/calendar/employees, /admin/calendar/events
 */
(function() {
  if ($('#employeeSelect').length === 0) return;

  var baseUrl = $('#base_url').val() || '';

  function getSelectedEmail() {
    return $('#employeeSelect').val() || '';
  }

  function getSelectedDate() {
    var val = $('#dateSelect').val() || '';
    if (val.length >= 10) return val.substring(0, 10);
    return val;
  }

  function setSelectedDate(yyyyMmDd) {
    $('#dateSelect').val(yyyyMmDd);
    $('#dateSelect').datepicker('setDate', yyyyMmDd);
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

  function loadEmployees() {
    alert(baseUrl + '/admin/calendar/employees');
    $.ajax({
    
      url: baseUrl + '/admin/calendar/employees',
      type: 'GET',
      success: function(res) {
        if (res.status !== 'success' || !res.data) return;
        var sel = $('#employeeSelect');
        sel.find('option:not(:first)').remove();
        res.data.forEach(function(emp) {
          sel.append($('<option></option>').attr('value', emp.email).text(emp.name ? emp.name + ' (' + emp.email + ')' : emp.email));
        });
      },
      error: function() {
        $('#eventsError').text('Failed to load employees.').show();
      }
    });
  }

  function loadEvents() {
    var email = getSelectedEmail();
    var date = getSelectedDate();
    if (!email || !date) {
      $('#eventsPlaceholder').show();
      $('#eventsLoading').hide();
      $('#eventsContainer').hide();
      $('#eventsError').hide();
      return;
    }
    $('#eventsPlaceholder').hide();
    $('#eventsLoading').show();
    $('#eventsContainer').hide();
    $('#eventsError').hide();

    $.ajax({
      url: baseUrl + '/admin/calendar/events',
      type: 'GET',
      data: { email: email, date: date },
      success: function(res) {
        $('#eventsLoading').hide();
        if (res.status !== 'success') {
          $('#eventsError').text(res.message || 'Failed to load events').show();
          return;
        }
        $('#eventsError').hide();
        var events = res.data || [];
        $('#eventsDateLabel').text(formatDateLabel(date));
        var tbody = $('#eventsTableBody');
        tbody.empty();
        if (events.length === 0) {
          tbody.append('<tr><td colspan="3" class="text-muted">No events for this day.</td></tr>');
        } else {
          events.forEach(function(ev) {
            var startTime = formatTime(ev.start);
            var endTime = formatTime(ev.end);
            var timeStr = ev.allDay ? 'All day' : (startTime + ' – ' + endTime);
            var details = [];
            if (ev.location) details.push('Location: ' + ev.location);
            if (ev.creator) details.push('Creator: ' + ev.creator);
            if (ev.description) details.push(ev.description);
            var detailsHtml = details.length ? details.join('<br>') : '—';
            tbody.append(
              '<tr><td>' + timeStr + '</td><td>' + (ev.summary || '(No title)') + '</td><td>' + detailsHtml + '</td></tr>'
            );
          });
        }
        $('#eventsContainer').show();
      },
      error: function(xhr) {
        $('#eventsLoading').hide();
        $('#eventsError').text(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Failed to load events').show();
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
    loadEvents();
  }

  function goNextDay() {
    var d = getSelectedDate();
    if (!d) return;
    var date = new Date(d + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    var str = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    setSelectedDate(str);
    loadEvents();
  }

  $('#employeeSelect').on('change', function() {
    if (getSelectedDate()) loadEvents();
  });

  $('#dateSelect').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true
  }).on('changeDate', function() {
    var d = $(this).datepicker('getDate');
    if (d) {
      var str = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (getSelectedEmail()) loadEvents();
    }
  });

  $('#prevDayBtn').on('click', goPrevDay);
  $('#nextDayBtn').on('click', goNextDay);

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  setSelectedDate(todayStr);

  loadEmployees();
})();
