(function () {

    var socket = io.connect(location.origin + '/socket.io/');

    function formatDate(d) {

        if (!d) return '-';

        months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Oct','Sep','Nov','Dec'];

        var hour = d.getHours() > 11  ? d.getHours() - 12 : d.getHours();
        hour = hour == 0 ? 12 : hour;
        var apm = d.getHours() > 10 || d.getHours() == 23 && d.getHours() != 0 ? 'pm' : 'am';
        var minutes = d.getMinutes() < 10 ? '0'+ d.getMinutes() : d.getMinutes();
  
        return months[d.getMonth()]+' '+d.getDate()+', '+hour+':'+minutes+' '+apm;
    }

    function confirm(args) {

        $('#confirm-modal .message').html(args.message);
        if (args.cancelText) $('#confirm-modal button.cancel').text(args.cancelText);
        if (args.confirmText) $('#confirm-modal button.confirm').text(args.confirmText);

        $('#confirm-modal button.confirm').on('click', args.confirmCallback);
        $('#confirm-modal button.cancel').on('click', args.cancelCallback);

        $('#confirm-modal').modal('show');
    }

    var nodeMonitor = new Worker('/static/node-monitor.js');

    // worker error handling
    nodeMonitor.addEventListener('error', function(e) {
        console.log('[nodeMonitor] error on '+ e.lineno,': ' +e.message);
    }, false);

    // main worker postMessage listener
    nodeMonitor.addEventListener('message', function(e) {
    
        var m = e.data;

        if (m['alert']) {

            $('#alert').show();

            $('#alert').removeClass('alert-info').removeClass('alert-success').removeClass('alert-warning').removeClass('alert-danger');
            $('#alert').addClass('alert-'+m.alert['type']);

            items = [];
            _.each(m.alert['messages'], function(message) {
                items.push($('<p>').html(message));
            });
            $('#alert div').append(items);
            $('#alert').show();
            $('#alert div').scrollTop($('#alert div')[0].scrollHeight);

        } else if (m['node-up']) {

            $('body').removeClass('stopped').addClass('running');
            $('#node-settings-modal').modal('hide');
            $('.nav button').addClass('btn-success');
            $('.nav button').removeClass('btn-warning');
            $('.nav button').removeClass('btn-danger');
            $('.nav button').show();
            $('#node-settings-modal .btn-success').hide();
            $('#node-settings-modal .btn-danger').show();
            $('#start-node').button('reset');

        } else if (m['node-starting']) {

            $('.nav button').removeClass('btn-success');
            $('.nav button').addClass('btn-warning');
            $('.nav button').removeClass('stopped');
            $('.nav button').show();

        } else if (m['node-down']) {

            $('body').removeClass('running').addClass('stopped');
            $('#node-settings-modal').modal('hide');
            $('.nav button').removeClass('btn-success');
            $('.nav button').removeClass('btn-warning');
            $('.nav button').addClass('btn-danger');
            $('.nav button').show();
            $('#node-settings-modal .btn-success').show();
            $('#node-settings-modal .btn-danger').hide();
            $('#stop-node').button('reset');

        } else if (m['peers']) {

            $('.peers').empty();

            $.each(m['peers'], function(address, info) {
                var p = $('<p>').text(address);
                $('.peers').append(p);
            });

        } else if (m['cycle']) {

            if (m['cycle'].phase == 'catching up') {
                var phase = $('<i>').text(m['cycle'].phase);
            } else {
                var phase = $('<span>').text(m['cycle'].phase);
            }
            $('.cycle h3').html('Cycle ending ' + formatDate(m['cycle'].end_date)).append(phase);

            if (m['cycle']['percent'] > 97.5) {
                var phases = [{name: 'reporting', percent: 87.5}, {name: 'reveal', percent: 10}, {name: 'svd', percent: m['cycle']['percent'] - 97.5}];
            } else if (m['cycle']['percent'] > 87.5) {
                var phases = [{name: 'reporting', percent: 87.5}, {name: 'reveal', percent: m['cycle']['percent'] - 87.5}];
            } else {
                var phases = [{name: 'reporting', percent: m['cycle']['percent']}];
            }

            var template = _.template($("#progress-template").html());
            $('.cycle .progress').empty();
            _.each(phases, function(p) {
                $('.cycle .progress').append(template({'type': p.name, 'percent': p.percent}))

            });

            $('.cycle').show();

        } else if (m['report']) {

            $('.cycle').removeClass('reporting').removeClass('reveal').removeClass('svd').addClass(m['report']['phase']);

            if (!$.isEmptyObject(m['report']['decisions'])) {

                $('#report-decisions').empty();

                var h = $('<h4>').html('Report');
                var s = $('<span>').html('Ends at ' + formatDate(m['report'].reveal_date));
                var report_header = $('<li>').addClass('list-group-item').append([h, s]);
                $('#report-decisions').append(report_header);
                var template = _.template($("#report-template").html());
                _.each(m['report']['decisions'], function(d, id) {

                    if (d['state'] == '0') { d['state_desc'] = 'False' }
                    else if (d['state'] == '1') { d['state_desc'] = 'True' }
                    else if (d['state'] == '0.6') { d['state_desc'] = 'Ambiguous or Indeterminent' }
                    else { d['state_desc'] = 'Absent' }

                    $('#report-decisions').append(template({'d': d}));
                });

                $('#report').show();

                $('#report input[name]').on('change', function(e) {

                    var report = {'decision_id': $(this).attr('name'), 'state': $(this).val()};
                    var state = $('#report input[name='+$(this).attr('name')+']').attr('data-state');
                    var self = this;

                    if (state) {

                        var dialog = {
                            message: 'Changing this decision will incur and additional fee.  Are you sure you wish to change it?',
                            confirmText: 'Change',
                            confirmCallback: function() {
                                nodeMonitor.postMessage({'report-decision': report});
                                $('#report input[name='+report.decision_id+']').attr('data-state', report.state);
                            },
                            cancelCallback: function() {
                                $('#report input[name='+report.decision_id+'][value="'+state+'"]').attr('checked', true);
                            }
                        }
                        
                        confirm(dialog);

                    } else {

                        nodeMonitor.postMessage({'report-decision': report});
                        $('#report input[name='+report.decision_id+']').attr('data-state', report.state);
                    }
                });


            } else {

                $('#report').hide();
            }
 
        } else if (m['branches']) {

             if (!$.isEmptyObject(m['branches'])) {

                $('.branches').empty()

                // sort on reputation
                //m['branches'] = m['branches'].sort(function(a,b) {return (a.my_rep > b.my_rep) ? -1 : ((b.my_rep > a.my_rep) ? 1 : 0);} );
                var has_branches = false;

                _.each(m['branches'], function(branch) {

                    m['branches'][branch['vote_id']] = branch;   // update local branches

                    // update add decision modal
                    $('#decision-branch').append($('<option>').val(branch.vote_id).text(branch.vote_id));

                    if (branch.my_rep) {

                        has_branches = true;
                        var p = $('<p>').html('<span class="pull-left"><b>'+branch.vote_id+'</b> ('+branch.my_rep+')</span>').addClass('clearfix');
                        var send = $('<a>').attr('href','#').addClass('pull-right').text('send').on('click', function() {
                            $('#rep-branch').val(branch.vote_id);
                            $('#send-rep-modal .branch').text(branch.vote_id);
                            $('#send-rep-modal').modal('show');
                        })
                        p.append(send);

                    } else {
                        var p = $('<p class="other">').html('<span>'+branch.vote_id+'</span>');
                    }
                    $('.branches').append(p);
                });

                var bt = $('<a>').addClass('pull-right branches-toggle').on('click', function(event) {
                    $('.branches').toggleClass('all');
                });
                $('.branches').append(bt);

            } else {

                var p = $('<p>').html('<span class="pull-left">There are no branches</span>');
                $('.branches').empty().append(p);
            }

        } else if (m['address']) {

            $('.address').html(m['address']);

        } else if (m['blockcount']) {

            $('.blocks').html('<span class="pull-left"><b>'+m['blockcount']+'</b> BLOCKS</span><a class="pull-right" href="#explore-modal" data-toggle="modal">explore</a>');

        } else if (m['view-block']) {

            $('.block-view').text(m['view-block']);

        } else if (m['markets']) {

            if (!$.isEmptyObject(m['markets'])) {

                $('.decisions').empty();
                _.each(m['markets'], function(m) {

                    if (m) {
                        var row = $('<tr>').html('<td class="text">'+m.txt+'</td><td>'+m.vote_id+'</td><td>'+formatDate(m.maturation_date)+'</td>');
                        var trade = $('<a>').attr('href', '#').text('trade').on('click', function() {
                            nodeMonitor.postMessage({'trade': m.decision_id});
                        });
                        if (m.status == 'open') {
                            var trade = $('<td>').append(trade).css('text-align', 'right');
                        } else if (m.status == 'pending') {
                            var trade = $('<td>').text('pending').css('text-align', 'right');
                        } else {
                            var trade = $('<td>').text('closed').css('text-align', 'right');
                        }
                        $(row).append(trade);
                        $('.decisions').append(row);
                    }
                });
            }

        } else if (m['trade']) {

            var m = m['trade'];
            var states = $('<select>').addClass('states, form-control').attr('name', 'market-state');
            var balances = $('<table>').addClass('table');
            balances.append($('<tr>').html('<th>State</th><th>Owned</th><th>Total</th>'));
            states.append($('<option>').text('Select'));
            _.each(m['states'], function(state) {
                var s = state == '1' || String(state).toLowerCase() == 'yes' ? 'True' : 'False';
                balances.append($('<tr>').html('<td>'+s+'</td><td></td><td></td>'));
                states.append($('<option>').val(state).text(s));
            });

            // reset trade modal state
            $('#trade-modal input[name=trade-type]').removeAttr('checked');
            $('#trade-modal label.btn').removeClass('active');
            $('#trade-modal button.trade').text('-').attr('disabled', true);

            $('#trade-modal .decision-text').text(m.txt);
            $('#trade-modal .balances').empty().append(balances);
            $('#trade-market').val(m.PM_id);
            $('#trade-modal').modal('show');
            $('#market-state').empty().append(states);

        } else if (m['miner']) {

            if (m['miner'] == 'on') {

                $('.miner-off').hide();
                $('.miner-on').show()

            } else {

                $('.miner-on').hide()
                $('.miner-off').show();
            }

        } else if (m['cash']) {

            $('.cash').html('<span class="pull-left"><b>'+m['cash']+'</b> CASH</span><a class="pull-right" href="#send-cash-modal" data-toggle="modal">send</a>');
        }

    }, false);

    ////
    // actions

    $('.miner-control a').on('click', function() {

        if ($('.miner-off').is(':visible')) {

            socket.emit('miner', 'start');
            
        } else if ($('.miner-on').is(':visible')) {

            socket.emit('miner', 'stop');
        }
    });

    $('#password-form').on('submit', function(event) {

        event.preventDefault();
        socket.emit('start', $('#password').val());
        $(this).hide();
        $('#start-node').button('loading');
        $('#start-node').show();
        $('#password-modal').modal('hide');
    }); 


    $('.reporting form').on('submit', function(event) {

        event.preventDefault();

        var results = $(this).serializeArray();

        _.each(results, function(r, i) {
            results[i]['branch'] = _decision[r.name].vote_id;
        });

        socket.emit('report', results);
    }); 


    $('#create-branch-modal form').on('submit', function(event) {

        event.preventDefault();
        socket.emit('create-branch', $('#branch-id').val());
        $('#create-branch-modal').modal('hide');
    });

    $('#add-decision-modal form').on('submit', function(event) {

        event.preventDefault();

        var args = {
            'branchId': $('#decision-branch').val(),
            'decisionText': $('#decision-text').val(),
            'decisionMaturation': $('#decision-time').val(),
            'marketInv': $('#market-investment').val()
        }

        socket.emit('add-decision', args);
        $('#add-decision-modal').modal('hide');
    });

    socket.on('add-decision', function(data) {
        nodeMonitor.postMessage({'add-decision': data});
    });

    $('#send-cash-modal form').on('submit', function(event) {

        event.preventDefault();
        var address = $('#cash-dest-address').val();
        var amount = $('#cash-amount').val();
        socket.emit('send-cash', address, amount);
        $('#send-cash-modal').modal('hide');
    });

    $('#trade-modal form').on('submit', function(event) {

        event.preventDefault();
        var args = {
            'marketId': $('#trade-market').val(),
            'marketState': $('#market-state select').val(),
            'tradeAmount': $('#trade-amount').val(),
            'tradeType': $('#trade-modal input[name=trade-type]').val()
        }
        socket.emit('trade', args);
        $('#trade-modal').modal('hide');
    });
    $('#trade-modal input[name=trade-type]').on('change', function(event) {
       $('#trade-modal button.trade').text($(this).val()).removeAttr('disabled');
    });

    $('#send-rep-modal form').on('submit', function(event) {

        event.preventDefault();
        var address = $('#rep-dest-address').val();
        var amount = $('#rep-amount').val();
        var branch = $('#rep-branch').val();
        
        socket.emit('send-reps', address, amount, branch);
        $('#send-rep-modal').modal('hide');
    });

    $('#explore-modal form').on('submit', function(event) {

        event.preventDefault();
        socket.emit('explore-block', $('#explore-modal input[name=block-number]').val());
    });

    socket.on('show-block', function(data) {
        $('#explore-modal pre').text(data);
    });

    $('#stop-node').on('click', function() {
        $(this).button('loading');
        socket.emit('stop');
    });

    $('#start-node').on('click', function() {
        $(this).hide();
        $('#password-form').show();
        $('#password').focus();
    });

    $('#alert').on('closed.bs.alert', function() {
        $('#alert div').empty();
    });

})()