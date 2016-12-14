import bower from 'bower.json';

import Paho from 'mqttws';
import $ from 'jquery';
import 'jquery-ui';
import 'free-jqgrid';
import 'bower_components/free-jqgrid/plugins/ui.multiselect';
import storage from 'bower_components/store-js/store'; // FIXME full path to workaround https://github.com/marcuswestin/store.js/pull/123

import 'bower_components/jquery-ui/themes/redmond/jquery-ui.min.css!';
import 'bower_components/free-jqgrid/css/ui.jqgrid.min.css!';
import 'bower_components/free-jqgrid/plugins/ui.multiselect.css!';

import 'index.less!';


/*******************************************************************************
 *  Config
 ******************************************************************************/

var config = storage.get('mqtt-admin') || {};

config.mqttHost = config.mqttHost || '';
config.mqttPort = config.mqttPort || '';
config.influxPort = config.influxPort || 8086;
config.clientId = config.clientId || 'mqtt-admin';
config.maxPayloadSize = config.maxPayloadSize || 1024;
config.mqttshTrim = config.mqttshTrim || false;

if (typeof config.clientIdSuffix === 'undefined') {
    config.clientIdSuffix = true;
}

if (!config.server) {
    config.server = [
        'ws://broker.hivemq.com:8000',
        'ws://test.mosca.io:80',
        'ws://test.mosquitto.org:8080',
        'wss://test.mosquitto.org:8081',
    ];
}




/*******************************************************************************
 * Utils
 ******************************************************************************/

function stringifyMisc(obj) {
    var tmp = $.extend(true, {}, obj);
    delete tmp.val;
    delete tmp.lc;
    delete tmp.ts;

    return JSON.stringify(tmp)
        .replace(/^{/, '')
        .replace(/}$/, '')
        ;
}

function escapePayload(str) {
    return $('<div/>').text(str.replace(/\n/, '\\n')).html();
}

function dateFormat(d) {
    if (d.toString() === 'Invalid Date') return '';
    var ret = '';
    // FIXME - hiding the date on todays events breaks jqGrid sorting
    // if (n.getDate() !== d.getDate() || n.getMonth() !== d.getMonth() || n.getFullYear() !== d.getFullYear()) {
    ret = d.getFullYear() + '-' +
        ("0" + (d.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (d.getDate()).toString(10)).slice(-2) + ' ';
    // }

    ret = ret +
        ("0" + (d.getHours()).toString(10)).slice(-2) + ':' +
        ("0" + (d.getMinutes()).toString(10)).slice(-2) + ':' +
        ("0" + (d.getSeconds()).toString(10)).slice(-2) /* + '.' +
     // TODO configurable timestamp format
     ("00" + (d.getMilliseconds()).toString(10)).slice(-3) */;

    return ret;
}


/*******************************************************************************
 *  Data
 ******************************************************************************/

var completions = [];
var topicTree = {};
var data = {};
var topicCount = 0;

function getCompletions(input) {
    var inputArr = input.split('/');
    var pointer = topicTree;
    inputArr.forEach(function (part, index) {
        if (pointer[part] && index < (inputArr.length - 1)) {
            pointer = pointer[part];
        }
    });
    var res = [];
    if (!input.match(/\+|#/)) {
        var search = inputArr.pop().replace(/[\-\[\]{}()*?.,\\\^$|\s]/g, "\\$&");
        Object.keys(pointer).forEach(function (pt) {
            if (pt.match(new RegExp(search, 'i'))) res.push(pt);
        });
    }
    res.sort();
    return res;
}


/*******************************************************************************
 *  Dialogs
 ******************************************************************************/

var $dialogTopicDetails =   $('#topicDetails');
var $dialogInflux =         $('#dialogInflux');
var $dialogSettings =       $('#dialogSettings');
var $host =                 $('#host');
var $port =                 $('#port');
var $mqttStatus =           $('#mqttStatus');
var $dialogAbout =          $('#about');
var $server =               $('#server');
var $protocol =             $('#protocol');
var $random =               $('#random');
var $clientId =             $('#clientId');
var $user =                 $('#user');
var $password =             $('#password');
var $tabsSettings =         $('#tabsSettings');
var $influxHost =           $('#influxHost');
var $influxPort =           $('#influxPort');
var $influxDatabase =       $('#influxDatabase');
var $influxEnable =         $('#influxEnable');

var $tabsDetails =          $('#tabsDetails');
var $gridInflux =           $('#gridInflux');
var $influxQuery =          $('#influxQuery');

var $mqttshTrim =           $('#mqttshTrim');
var $mqttshAutocomplete =   $('#mqttshAutocomplete');

$dialogTopicDetails.dialog({
    autoOpen: false,
    width: 720,
    height: 500
});

$dialogAbout.dialog({
    title: 'mqtt-admin version ' + bower.version,
    modal: true,
    autoOpen: false,
    width: 640,
    height: 400
});

for (var i = 0; i < config.server.length; i++) {
    $server.append('<option value="' + config.server[i] + '">' + config.server[i] + '</option>');
}




$server.selectmenu({
    width: 280,
    open: function() {
        $('.ui-selectmenu-open').zIndex($dialogSettings.zIndex()+1);
    },
    change: function () {
        var $this = $(this);
        var tmp0 = $this.val().split('://');
        var tmp = tmp0[1].split(':');
        $protocol.val(tmp0[0]).selectmenu('refresh');
        $host.val(tmp[0]);
        $port.val(tmp[1]);
        $server.val('');
        $server.selectmenu('refresh');
    }
});

$protocol.selectmenu({
    width: 96,
    open: function() {
        $('.ui-selectmenu-open').zIndex($dialogSettings.zIndex()+1);
    }
});



$dialogSettings.dialog({
    width: 640,
    height: 450,
    autoOpen: false,
    open: function () {
        $tabsSettings.tabs('option', 'active', 0);
        $server.val('');
        $protocol.val(config.protocol || 'ws').selectmenu('refresh');
        $host.val(config.mqttHost);
        $port.val(config.mqttPort);
        $user.val(config.user);
        $password.val(config.password);
        config.clientIdSuffix ? $random.attr('checked', true) : $random.removeAttr('checked');
        $clientId.val(config.clientId);
        config.influxEnable ? $influxEnable.attr('checked', true) : $influxEnable.removeAttr('checked');
        $influxHost.val(config.influxHost);
        $influxPort.val(config.influxPort);
        $influxDatabase.val(config.influxDatabase);
        config.mqttshTrim ? $mqttshTrim.attr('checked', true) : $mqttshTrim.removeAttr('checked');
        config.mqttshAutocomplete ? $mqttshAutocomplete.attr('checked', true) : $mqttshAutocomplete.removeAttr('checked');

    },
    close: function () {
        $topic.focus();
    },
    buttons: [
        {
            text: 'Save Settings',
            click: function () {
                config.influxHost = $influxHost.val();
                config.influxPort = parseInt($influxPort.val());

                if (
                    config.influxEnable         !== $influxEnable.is(':checked') ||
                    config.influxHost           !== $influxHost.val() ||
                    config.influxPort           !== $influxPort.val() ||
                    config.influxDatabase       !== $influxDatabase.val() ||
                    config.clientId             !== $clientId.val() ||
                    config.user                 !== $user.val() ||
                    config.password             !== $password.val() ||
                    config.mqttHost             !== $host.val() ||
                    config.mqttPort             !== parseInt($port.val(), 10) ||
                    config.protocol             !== ($protocol.val()) ||
                    config.clientIdSuffix       !== $random.is(':checked') ||
                    config.mqttshTrim           !== $mqttshTrim.is(':checked') ||
                    config.mqttshAutocomplete   !== $mqttshAutocomplete.is(':checked')

                ) {
                    config.influxEnable = $influxEnable.is(':checked');
                    config.influxHost = $influxHost.val();
                    config.influxPort = $influxPort.val();
                    config.influxDatabase = $influxDatabase.val();
                    config.clientId = $clientId.val();
                    config.user = $user.val();
                    config.password = $password.val();
                    config.mqttHost = $host.val();
                    config.mqttPort = parseInt($port.val(), 10);
                    config.protocol = $protocol.val();
                    config.clientIdSuffix = $random.is(':checked');
                    config.mqttshTrim = $mqttshTrim.is(':checked');
                    config.mqttshAutocomplete = $mqttshAutocomplete.is(':checked');
                    storage.set('mqtt-admin', config);
                    mqttDisconnect();
                    window.location.reload();
                } else {
                    storage.set('mqtt-admin', config);
                    if (mqttConnected) $dialogSettings.dialog('close');
                }

            }
        }

    ],
    modal: true
});

$tabsSettings.tabs();
$tabsDetails.tabs();
$gridInflux.jqGrid({
    datatype: "local",
    colNames: ['id', 'time', 'value'],
    colModel: [
        {name: 'id', index: 'id'},
        {name: 'time', index: 'time'},
        {name: 'value', index: 'value'}
    ],
    rowNum: 1000,
    rowList:[25, 100, 1000, 100000],
    width: 650,
    height: 320,
    viewrecords: true,
    caption: "InfluxDB"

});


/*******************************************************************************
 *  Main Tab Navigation
 ******************************************************************************/

var $mqttIndicator;

$('#tabs').tabs({
    create: function () {
        $('#tabs .ui-tabs-nav:first').prepend('<li class="header">mqtt-admin</li>')
            .append('<button title="About" value="About" class="menu-button" id="buttonAbout">About</button>')
            .append('<button title="Settings" value="Settings" class="menu-button" id="buttonSettings">Settings</button>')
            .append('<div id="mqttIndicator" class="menu-button" style="display:none;"><span class="inline-icon ui-icon ui-icon-transfer-e-w"></span></div>')
        ;

        $mqttIndicator = $('#mqttIndicator');

        $('#buttonSettings').button({
            text: false,
            icons: {
                primary: 'ui-icon-gear'
            }
        }).click(function () {
            $dialogSettings.dialog('open');
        });

        $('#buttonAbout').button({
            text: false,
            icons: {
                primary: 'ui-icon-help'
            }
        }).click(function () {
            $dialogAbout.dialog('open');
        });

        window.addEventListener("hashchange", function (e) {
            var hash = window.location.hash;
            //console.log(e, hash);
            switch (hash) {
                case '#subscribe':
                    $('#tabs').tabs('option','active', 1);
                    break;
                case '#status':
                    $('#tabs').tabs('option','active', 2);
                    break;
                default:
                    $('#tabs').tabs('option','active', 0);


            }
        });

    },
    activate: function(event, ui) {

        window.location.hash = ui.newPanel.attr('id');
        resizeGrids();
    }
});


/********************************************
    Tab Status
 ********************************************/

var $topic = $('#topic');
$topic.val(config.topic);

var isGridStatusRow = [];
var searchPattern = '#';
var searchPatternRegExp;

function topicRefresh(e) {

    console.log('!', searchPattern, $topic.val(), e);


    searchPattern = $topic.val();

    if (config.mqttshAutocomplete && e && (e.keyCode === 55 || e.which === 191)) searchPattern = searchPattern.replace(/^([^/]+)\/\//, '$1/status/');

    if (searchPattern !== $topic.val()) {
        $topic.val(searchPattern);
    }

    searchPatternRegExp = mqttWildcards(searchPattern);
    completions = getCompletions(searchPattern);

}

$topic.on('change', function () {
    buildTable(searchPattern);
});
$topic.on('keyup', topicRefresh);

$topic.autocomplete({
    source: function (req, res) {
        res(getCompletions(req.term));
    },
    select: function (event, ui) {
        var tmp = $topic.val().split('/');
        tmp.pop();
        tmp.push(ui.item.value);
        $topic.val(tmp.join('/'));
        return false;
    },
    focus: function (event, ui) {
        //$topic.val(ui.item.name);
        return false;
    }

});


/*******************************************************************************
 *  gridStatus
 ******************************************************************************/

var $gridStatus =       $('#gridStatus');
var $load_gridStatus =  $('#load_gridStatus');

var colNamesStatus = ['id', 'topic', 'val', 'ts', 'lc', 'misc properties', 'payload', 'retained',]; // 'tools'];
var colModelStatus = [
    {name: 'id', index: 'id', hidden: true, autoResizable: true},
    {name: 'topic', index: 'topic', width: 360, autoResizable: true},
    {name: 'val', index: 'val', width: 100, align: 'right', hidden: true, autoResizable: true},
    {name: 'ts', index: 'ts', width: 140, fixed: true, align: 'right', hidden: true, autoResizable: true},
    {name: 'lc', index: 'lc', width: 140, fixed: true, align: 'right', hidden: true, autoResizable: true},
    {name: 'misc', index: 'misc', width: 360, hidden: true, autoResizable: true},
    {name: 'payload', index: 'payload', width: 640, autoResizable: true},
    {name: 'retained', index: 'retained', width: 30, hidden: false, fixed: true, formatter: formatBool, autoResizable: true}
    //{name: 'tools', index: 'tools', width: 60, hidden: true, fixed: true, formatter: formatBool, autoResizable: true, sortable: false}
];

var gridStatusState = restoreGridState('gridStatus', colModelStatus);

var isColState = typeof (gridStatusState) !== 'undefined' && gridStatusState !== null;

var gridStatusFirstLoad = true;
$gridStatus.jqGrid({
    datatype: "local",
    colNames: colNamesStatus,
    colModel: colModelStatus,
    rowNum: 1000,
    rowList:[25, 100, 1000, 100000],
    width: 800,
    viewrecords: true,
    caption: "MQTT Status",
    pager: '#pagerStatus',
    page: isColState ? gridStatusState.page : 1,
    search: isColState ? gridStatusState.search : false,
    sortname: isColState ? gridStatusState.sortname : 'id',
    sortorder: isColState ? gridStatusState.sortorder : 'desc',
    ondblClickRow: function (rowid, iRow, iCol, e) {
        $dialogTopicDetails.dialog('open');
    },
    beforeSelectRow: function(rowid, e) {
        return false;
    },
    gridComplete: function () {
        //resizeGrids();
    },
    loadComplete: function () {
        if (gridStatusFirstLoad) {
            gridStatusFirstLoad = false;
            if (isColState) {
                $(this).jqGrid("remapColumns", gridStatusState.permutation, true);
            }
        }
        saveGridState.call($(this), 'gridStatus', this.p.remapColumns);
    }
    /*subGrid: true,
     subGridRowExpanded: function (pid, id) {
     //console.log(pid, id);
     var $container = $('#' + pid);
     //console.log(pid, id, $container);
     $container.css('background-color', 'red').append('<div>mUHHH!</div>');
     }*/

});

$gridStatus.jqGrid('filterToolbar', {
    autosearch: true,
    defaultSearch: 'cn',
    searchOperators: true
});

$gridStatus
    .navGrid('#pagerStatus', {edit: false, add: false, del: false, search: false, refresh: false})
    .navButtonAdd('#pagerStatus', {
        caption: 'choose columns',
        buttonicon: 'ui-icon-calculator',
        onClickButton: function () {
            $gridStatus.jqGrid('columnChooser', {
                done: function (perm) {
                    if (perm) {
                        $gridStatus.jqGrid("remapColumns", perm, true);
                        saveGridState.call(this, 'gridStatus', perm);



                    }

                }
            });
        },
        position: 'last'
    });


function buildRow(topic) {
    var row = {
        id: data[topic].tid,
        topic: config.mqttshTrim ? topic.replace(/^([^\/]+)\/status\/(.+)/, '$1//$2') : topic,
        payload: escapePayload(data[topic].payload),
        val: $('<div/>').text(data[topic].val).html(),
        retained: data[topic].retained,
        ts: dateFormat(new Date(data[topic].ts)),
        lc: dateFormat(new Date(data[topic].lc))
    };
    if (data[topic].ts === data[topic].lc) {
        row.lc = '<span style="color: grey">' + row.lc + '</span>';
    }
    row.misc = stringifyMisc(data[topic].payloadObj);
    return row;
}

function buildTable(topic) {
    $load_gridStatus.show();
    topicRefresh();

    config.topic = topic;
    storage.set('mqtt-admin', config);

    //console.log('buildTable', topic, searchPatternRegExp);

    $gridStatus.jqGrid('clearGridData');

    if (topic === '') {
        return;
    }

    var result = [];

    isGridStatusRow = [];

    Object.keys(data).forEach(function (key) {
        if (key.match(searchPatternRegExp)) {
            isGridStatusRow.push(key);
            result.push(buildRow(key));
        }
    });

    $gridStatus.jqGrid('setGridParam', { data: result }).trigger('reloadGrid');

    $load_gridStatus.hide();

}


/*******************************************************************************
 *  Tab Publish
 ******************************************************************************/

var $tabsPublish =      $('#tabsPublish');
var $publishPayload =   $('#publishPayload');
var $publishPub =       $('#publishPub');
var $publishTopic =     $('#publishTopic');
var $publishQos =       $('#publishQos');
var $publishPubRetain =  $('#publishPubRetain');

$publishQos.selectmenu({
    width: 90
});

$publishPub.button({disabled: true}).css('width', '130px').click(function () {
    mqttPublish($publishTopic.val(), $publishPayload.val(), {qos: parseInt($publishQos.val(), 10), retain: false});
});

$publishPubRetain.button({disabled: true}).click(function () {
    mqttPublish($publishTopic.val(), $publishPayload.val(), {qos: parseInt($publishQos.val(), 10), retain: true});
});

$tabsPublish.tabs();

$publishTopic.autocomplete({
    source: function (req, res) {
        res(getCompletions(req.term));
    },
    select: function (event, ui) {
        var tmp = $publishTopic.val().split('/');
        tmp.pop();
        tmp.push(ui.item.value);
        $publishTopic.val(tmp.join('/'));
        return false;
    },
    focus: function (event, ui) {
        //$topic.val(ui.item.name);
        return false;
    }

});

$publishTopic.on('keyup', function (e) {
    if ($publishTopic.val() !== '') {
        $publishPub.button('enable');
        $publishPubRetain.button('enable');
    } else {
        $publishPub.button('disable');
        $publishPubRetain.button('disable');
    }
    if (config.mqttshAutocomplete && e && (e.keyCode === 55 || e.which === 191)) $publishTopic.val($publishTopic.val().replace(/^([^/]+)\/\//, '$1/set/'));
});

$publishPayload.on('keyup', function () {
    var payload = $publishPayload.val();
    if (payload.match(/^\s*(\{|\[)/)) {
        try {
            JSON.parse(payload);
            $('#jsonLint').show();
        } catch (e) {
            $('#jsonLint').hide();
        }
    } else {
        $('#jsonLint').hide();
    }

});


/*******************************************************************************
 *  gridHistory
 ******************************************************************************/



var $gridHistory = $('#gridHistory');
var gridHistoryFirstLoad = true;
var colNamesHistory = ['id', 'topic', 'ts', 'payload', 'retain'];
var colModelHistory = [
    {name: 'id', index: 'id', hidden: true, autoResizable: true},
    {name: 'topic', index: 'topic', width: 200, sortable: false, autoResizable: true},
    {name: 'ts', index: 'ts', width: 140, sortable: false, fixed: true, align: 'right', hidden: true, autoResizable: true},
    {name: 'payload', index: 'payload', sortable: false, width: 900, formatter: escapePayload, autoResizable: true},
    {name: 'retain', index: 'retain', width: 30, sortable: false, hidden: true, fixed: true, autoResizable: true}
];

var gridHistoryState = restoreGridState('gridHistory', colModelHistory);

if (config.publishHistory) {
    //console.log('...', config.publishHistory, typeof config.publishHistory);
    //config.publishHistory = Array.prototype.slice.call(config.publishHistory);
} else {
    config.publishHistory = [];
}

isColState = typeof (gridHistoryState) !== 'undefined' && gridHistoryState !== null;
$gridHistory.jqGrid({
    datatype: "local",
    data: config.publishHistory,
    colNames: colNamesHistory,
    colModel: colModelHistory,
    rowNum: 1000,
    rowList:[25, 100, 1000, 100000],
    width: 800,
    viewrecords: true,
    caption: "Publish History",
    //pager: '#pagerHistory',
    page: isColState ? gridHistoryState.page : 1,
    search: isColState ? gridHistoryState.search : false,
    sortname: 'ts', //isColState ? gridHistoryState.sortname : 'id',
    sortorder: 'desc', //isColState ? gridHistoryState.sortorder : 'desc',
    ondblClickRow: function (rowid) {
        $publishTopic.val(config.publishHistory[rowid-1].topic);
        $publishPayload.val(config.publishHistory[rowid-1].payload);
        $publishPub.button('enable');
        $publishPubRetain.button('enable');
        $publishPub.trigger('click');
    },
    onSelectRow: function (rowid) {
        $publishTopic.val(config.publishHistory[rowid-1].topic);
        $publishPayload.val(config.publishHistory[rowid-1].payload);
        $publishPub.button('enable');
        $publishPubRetain.button('enable');
    },
    gridComplete: function () {
        //resizeGrids();
    },
    loadComplete: function () {
        if (gridHistoryFirstLoad) {
            gridHistoryFirstLoad = false;
            if (isColState) {
                $(this).jqGrid("remapColumns", gridHistoryState.permutation, true);
            }
        }
        saveGridState.call($(this), 'gridHistory', this.p.remapColumns);
    }
});

var publishHistory = Array.prototype.slice.call(config.publishHistory) || [];

function addToHistory(topic, payload, retain) {
    if (!publishHistory) publishHistory = [];

    for (var i = 0; i < publishHistory.length; i++) {
        if (publishHistory[i].topic === topic && publishHistory[i].payload === payload) {
            publishHistory.splice(i, 1);
            //break;
        }
    }

    publishHistory.push({id: publishHistory.length, topic: topic, payload: payload, retain: retain, ts: dateFormat(new Date())});

    for (var i = 0; i < publishHistory.length; i++) {
        publishHistory[i].id = i + 1;
    }

    //console.log('history', publishHistory);
    config.publishHistory = publishHistory;
    storage.set('mqtt-admin', config);

    $gridHistory.jqGrid('clearGridData');
    $('#load_gridHistory').show();

    $gridHistory.jqGrid('setGridParam', {data: publishHistory}).trigger('reloadGrid');
    $('#load_gridHistory').hide();

}


/*******************************************************************************
 *  gridFavorites
 ******************************************************************************/

/* TODO
var $gridFavorites = $('#gridFavorites');
var gridFavoritesFirstLoad = true;
var colNamesFavorites = ['id', 'topic', 'ts', 'payload', 'retain'];
var colModelFavorites = [
    {name: 'id', index: 'id', hidden: true},
    {name: 'topic', index: 'topic', width: 360},
    {name: 'ts', index: 'ts', width: 140, fixed: true, align: 'right', hidden: true},
    {name: 'payload', index: 'payload', width: 640},
    {name: 'retain', index: 'retain', width: 30, hidden: true, fixed: true}
];

var gridFavoritesState = restoreGridState('gridFavorites', colModelFavorites);

isColState = typeof (gridFavoritesState) !== 'undefined' && gridFavoritesState !== null;
$gridFavorites.jqGrid({
    datatype: "local",
    colNames: colNamesFavorites,
    colModel: colModelFavorites,
    rowNum: 1000,
    rowList:[25, 100, 1000, 100000],
    width: 800,
    viewrecords: true,
    caption: "Publish Favorites",
    pager: '#pagerFavorites',
    page: isColState ? gridFavoritesState.page : 1,
    search: isColState ? gridFavoritesState.search : false,
    sortname: isColState ? gridFavoritesState.sortname : 'id',
    sortorder: isColState ? gridFavoritesState.sortorder : 'desc',
    ondblClickRow: function (rowid, iRow, iCol, e) {

    },
    gridComplete: function () {
        //resizeGrids();
    },
    loadComplete: function () {
        if (gridFavoritesFirstLoad) {
            gridFavoritesFirstLoad = false;
            if (isColState) {
                $(this).jqGrid("remapColumns", gridFavoritesState.permutation, true);
            }
        }
        saveGridState.call($(this), 'gridFavorites', this.p.remapColumns);
    }
});
*/


/*******************************************************************************
 *  Tab Subscribe
 ******************************************************************************/

var $tabsSubscribe = $('#tabsSubscribe');

var subscriptions = {};
var pauseCache = {};

$.widget( "custom.colorselectmenu", $.ui.selectmenu, {
    _renderItem: function( ul, item ) {
        console.log(item)
        var li = $( "<li class='" + item.element.attr( "data-class" ) + "'>" + item.label + "</li>");

        if ( item.disabled ) {
            li.addClass( "ui-state-disabled" );
        }

        return li.appendTo( ul );
    },
    _setText: function( element, value ) {
        element.removeClass(function (index, css) {
            return (css.match (/(^|\s)palette-\S+/g) || []).join(' ');
        });
        if ( value ) {
            element.addClass('palette-' + value);
        }
        element.html( "&nbsp;" );
    }
});

function buildSubscribeRow(topic, payload, color) {
    var row = {
        topic: config.mqttshTrim ? topic.replace(/^([^\/]+)\/status\/(.+)/, '$1//$2') : topic,
        payload: escapePayload(payload),
        ts: '<span class="fill-cell palette-' + color + '">' + dateFormat(new Date()) + '</span>',
    };
    return row;
}

$tabsSubscribe.tabs({
    activate: function () {
        config.tabsSubscribeActive = $tabsSubscribe.tabs('option', 'active');
        storage.set('mqtt-admin', config);
    }
});

$tabsSubscribe.delegate('span.ui-icon-close.subscribe-tab', 'click', function () {

    var panelId = $(this).closest('li').remove().attr('aria-controls');
    //console.log('remove', panelId)

    config.tabsSubscribeOrder.splice(config.tabsSubscribeOrder.indexOf(panelId + '_li'), 1);
    delete config.tabsSubscribe[panelId];
    delete subscriptions[panelId];

    $('#' + panelId).remove();
    $tabsSubscribe.tabs('refresh');

    storage.set('mqtt-admin', config);

});

$tabsSubscribe.delegate('.subscription-remove', 'click', function () {
    var $this = $(this);
    var tab = $this.attr('data-id');
    var topic = $this.attr('data-topic');
    //console.log('remove', tab, topic);
    //console.log(subscriptions[tab]);
    subscriptions[tab].topics.splice(subscriptions[tab].topics.indexOf(topic), 1);
    config.tabsSubscribe[tab].subscriptions.splice(config.tabsSubscribe[tab].subscriptions.indexOf(topic), 1);
    storage.set('mqtt-admin', config);
    $this.parent().remove();
    resizeGrids();

});


if (!config.tabsSubscribe) config.tabsSubscribe = {};
if (!config.tabsSubscribeOrder) config.tabsSubscribeOrder = [];

function nextId(id) {
    id = id || 0;
    if (config.tabsSubscribe['tabSubscribe-' + id]) {
        return nextId(id + 1);
    } else {
        return 'tabSubscribe-' + id;
    }
}

function addTab(id, label) {
    //console.log('addTab', id, label);
    var $uiTabsNav = $tabsSubscribe.find('.ui-tabs-nav');
    id = id || nextId();
    label = label || ('Tab ' + id.split('-')[1]);

    if (!config.tabsSubscribe[id]) config.tabsSubscribe[id] = {label: label, subscriptions: [], colors: []};

    var $li = $('<li id="' + id + '_li">' +
        '<input style="display: none;" class="txt" type="text"/>' +
        '<a href="#' + id + '">' + label + '</a> ' +
        '<span class="ui-icon ui-icon-close subscribe-tab" role="presentation">Remove Tab</span>' +
        '</li>');

    if ($uiTabsNav.hasClass('ui-sortable')) {
        $uiTabsNav.sortable('destroy');
    }

    $uiTabsNav.append($li);

    $uiTabsNav.find('#' + id + '_li').on('dblclick', function () {
        $(this).find('input').toggle().val($(this).find('a').html()).focus();
        $(this).find('a').toggle();
    }).on('keydown blur dblclick', 'input', function (e) {
        var $this = $(this);
        if (e.type === 'keydown') {
            //console.log('keydown', e.which);
            if (e.which === 13) {
                $this.toggle();
                $this.siblings('a').toggle().html($this.val());
                config.tabsSubscribe[id].label = $this.val();
                storage.set('mqtt-admin', config);
            } else if (e.which === 38 || e.which === 40 || e.which === 37 || e.which === 39 || e.keyCode  ===  32) {
                e.stopPropagation();
            } else if (e.which === 27) {
                $this.toggle().val($this.siblings('a').val());
                $this.siblings('a').toggle();
            }
        } else if (e.type === 'focusout') {
            if ($this.css('display') === 'inline-block') {
                $this.toggle();
                $this.siblings('a').toggle().html($this.val());
                config.tabsSubscribe[id].label = $this.val();
                storage.set('mqtt-admin', config);
            }
        } else {
            e.stopPropagation();
        }
    });


    $tabsSubscribe.append('<div id="' + id + '">' +
        '<div class="subscribe-header">' +
        '<select id="' + id + '_color" class="subscribe-color">' +
        '<option value="0" data-class="palette-0"></option>' +
        '<option value="1" data-class="palette-1">1</option>' +
        '<option value="2" data-class="palette-2">2</option>' +
        '<option value="3" data-class="palette-3">3</option>' +
        '<option value="4" data-class="palette-4">4</option>' +
        '<option value="5" data-class="palette-5">5</option>' +
        '<option value="6" data-class="palette-6">6</option>' +
        '<option value="7" data-class="palette-7">7</option>' +
        '<option value="8" data-class="palette-8">8</option>' +
        '</select>' +
        '<input id="' + id + '_input" class="subscribe-input ui-widget ui-widget-content ui-corner-all"' +
        ' type="text" placeholder=" ...type in a topic (wildcards + and # allowed) and press enter"></input>' +
        '<p><span class="subscribe-buttons">' +
        '<input type="radio" id="' + id + '_play" name="' + id + '_mode">' +
        '<label for="' + id + '_play"><span class="inline-icon ui-icon ui-icon-play"></span></label>' +
        '<input type="radio" id="' + id + '_pause" name="' + id + '_mode">' +
        '<label for="' + id + '_pause"><span class="inline-icon ui-icon ui-icon-pause"></span></label>' +
        '<input type="radio" id="' + id + '_stop" name="' + id + '_mode" checked="checked">' +
        '<label for="' + id + '_stop"><span class="inline-icon ui-icon ui-icon-stop"></span></label>' +
        '</span>' +
        '<button class="subscribe-clear" id="' + id + '_clear"></button>' +
        '</p>' +
        '<ul class="subscriptions"></ul>' +
        '<div style="clear: both;"></div></div>' +
        '<table id="' + id + '_grid" class="subscribe-grid"></table>' +
        '</div>');

    var $grid = $('#' + id + '_grid');

    $('#' + id).find('.subscribe-color').colorselectmenu({
        width: 40
    });

    var $buttons = $tabsSubscribe.find('#' + id + ' .subscribe-buttons');
    $buttons.buttonset();
    $tabsSubscribe.find('#' + id + '_clear').button({
        icons: {
            primary: 'ui-icon-trash'
        }
    }).click(function () {
        $grid.jqGrid('clearGridData');
    });

    $buttons.find('input[type="radio"]').change(function () {
        var $this = $(this);
        if ($this.is(':checked')) {
            var mode = $this.attr('id').split('_')[1];

            subscriptions[id].mode = mode;
            if (mode === 'play' && pauseCache[id]) {
                $grid.jqGrid('addRowData', 'id', pauseCache[id], 'first');
                pauseCache[id] = [];
            }

        }
        //console.log(subscriptions);
    });

    subscriptions[id] = {
        mode: 'stop',
        topics: [],
        $grid: $grid,
        count: 0,
        colors: []
    };

    var colNamesSubscribe = ['id', 'ts', 'topic', 'val', 'lc', 'misc properties', 'payload', 'duplicate'];
    var colModelSubscribe = [
        {name: 'id', index: 'id', hidden: true, sortable: false, autoResizable: true},
        {name: 'ts', index: 'ts', width: 140, fixed: true, align: 'right', hidden: false, sortable: false, autoResizable: true},
        {name: 'topic', index: 'topic', width: 360, sortable: false, autoResizable: true},
        {name: 'val', index: 'val', width: 100, align: 'right', hidden: true, sortable: false, autoResizable: true},
        {name: 'lc', index: 'lc', width: 140, fixed: true, align: 'right', hidden: true, sortable: false, autoResizable: true},
        {name: 'misc', index: 'misc', width: 360, hidden: true, sortable: false, autoResizable: true},
        {name: 'payload', index: 'payload', width: 640, sortable: false, autoResizable: true},
        {name: 'dup', index: 'dup', width: 30, hidden: true, fixed: true, formatter: formatBool, sortable: false, autoResizable: true}
    ];

    $grid.jqGrid({
        datatype: "local",
        data: [],
        colNames: colNamesSubscribe,
        colModel: colModelSubscribe,
        rowNum: 1000,
        rowList:[25, 100, 1000, 100000],
        width: '800',
        viewrecords: true,
        caption: "subscribe",
        //pager: '#pagerHistory',
        page: isColState ? gridHistoryState.page : 1,
        search: isColState ? gridHistoryState.search : false,
        sortname: 'ts', //isColState ? gridHistoryState.sortname : 'id',
        sortorder: 'desc', //isColState ? gridHistoryState.sortorder : 'desc',
        ondblClickRow: function (rowid) {
        },
        beforeSelectRow: function(rowid, e) {
            return false;
        },
        onSelectRow: function (rowid) {
        },
        gridComplete: function () {
            //resizeGrids();
        },
        loadComplete: function () {
        }
    });

    $tabsSubscribe.find('div[id="' + id + '"] input[type="text"]').change(function () {
        var $this = $(this);
        var topic = $this.val();
        if (!topic) return;
        $this.val('');
        var color = $this.parent().find('.subscribe-color').val();
        if (subscriptions[id].topics.indexOf(topic) === -1) {
            subscriptions[id].topics.push(topic);
            subscriptions[id].colors[subscriptions[id].topics.indexOf(topic)] = color;
            $tabsSubscribe.find('div[id="' + id + '"] ul.subscriptions').append('<li class="palette-' + color + '">' + topic +
                ' <span data-id="' + id + '" data-topic="' + topic +'" class="subscription-remove ui-icon ui-icon-close inline-icon" role="presentation">Remove Tab</span></li>');
            if (config.tabsSubscribe[id].subscriptions.indexOf(topic) === -1) {
                config.tabsSubscribe[id].subscriptions.push(topic);
            }
            config.tabsSubscribe[id].colors[config.tabsSubscribe[id].subscriptions.indexOf(topic)] = color;


            $buttons.find('input[id$="_pause"]').removeAttr('checked');
            $buttons.find('input[id$="_stop"]').removeAttr('checked');
            $buttons.find('input[id$="_play"]').attr('checked', true);
            $buttons.buttonset('refresh');
            subscriptions[id].mode = 'play';

            if (pauseCache[id]) {
                $grid.jqGrid('addRowData', 'id', pauseCache[id], 'first');
                pauseCache[id] = [];
            }

            //console.log(config);
            storage.set('mqtt-admin', config);
        }
    }).autocomplete({
        source: function (req, res) {
            res(getCompletions(req.term));
        },
        select: function (event, ui) {
            var tmp = $tabsSubscribe.find('div[id="' + id + '"] input[type="text"]').val().split('/');
            tmp.pop();
            tmp.push(ui.item.value);
            $tabsSubscribe.find('div[id="' + id + '"] input[type="text"]').val(tmp.join('/'));
            return false;
        },
        focus: function (event, ui) {
            //$topic.val(ui.item.name);
            return false;
        }

    }).on('keyup', function (e) {
        var $this = $(this);
        if (config.mqttshAutocomplete && e && (e.keyCode === 55 || e.which === 191)) $this.val($this.val().replace(/^([^/]+)\/\//, '$1/status/'));
    });

    // restore subscriptions
    if (config.tabsSubscribe[id].subscriptions.length) {
        for (var i = 0; i < config.tabsSubscribe[id].subscriptions.length; i++) {
            //console.log('restore', config.tabsSubscribe[id].subscriptions[i]);
            $tabsSubscribe.find('div[id="' + id + '"] ul.subscriptions').append('<li class="palette-' + config.tabsSubscribe[id].colors[i] + '">' + config.tabsSubscribe[id].subscriptions[i] +
                ' <span data-id="' + id + '" data-topic="' + config.tabsSubscribe[id].subscriptions[i] +'" class="subscription-remove ui-icon ui-icon-close inline-icon" role="presentation">Remove Tab</span></li>');
            subscriptions[id].topics.push(config.tabsSubscribe[id].subscriptions[i]);
            subscriptions[id].colors.push(config.tabsSubscribe[id].colors[i]);
        }
    }

    $uiTabsNav.sortable({
        axis:'x',
        update: function() {
            $tabsSubscribe.tabs('refresh');
            config.tabsSubscribeOrder = $uiTabsNav.sortable('toArray').slice(1);
            storage.set('mqtt-admin', config);
        }
    });

    $tabsSubscribe.tabs('refresh');
    config.tabsSubscribeOrder = $uiTabsNav.sortable('toArray').slice(1);
    storage.set('mqtt-admin', config);

    resizeGrids();
}

$("#tabsSubscribe .ui-tabs-nav:first").
    append("<button title='Add tab' value='Add tab' class='menu-button' id='addTab'>Add tab</button>");

$('#addTab').button({
    text: false,
    icons: {
        primary: 'ui-icon-plus'
    }
}).click(function () {
    addTab();
    $tabsSubscribe.tabs('option','active', Object.keys(config.tabsSubscribe).length - 1);

});


if (config.tabsSubscribeOrder.length === 0) {
    // Add 1 empty tab
    addTab();
    $tabsSubscribe.tabs('option','active', 0);
} else {
    // restore tabs
    config.tabsSubscribeOrder.forEach(function (id, index) {
        id = id.split('_')[0];
        addTab(id, config.tabsSubscribe[id].label);
        if (index === config.tabsSubscribeActive) {
            $tabsSubscribe.tabs('option','active', index);
        }
    });
}




/*******************************************************************************
    common grid functions
 ******************************************************************************/

function formatBool(b) {
    return b ? '<span class="ui-icon ui-icon-check"></span>' : '';
}

function saveGridState(name, perm) {

    var colModel = this.jqGrid('getGridParam', 'colModel'), i, l = colModel.length, colItem, cmName,
        columnsState = {
            search: this.jqGrid('getGridParam', 'search'),
            //page: this.jqGrid('getGridParam', 'page'),
            sortname: this.jqGrid('getGridParam', 'sortname'),
            sortorder: this.jqGrid('getGridParam', 'sortorder'),
            permutation: perm,
            colStates: {}
        },
        colStates = columnsState.colStates;

    for (i = 0; i < l; i++) {
        colItem = colModel[i];
        cmName = colItem.name;
        if (cmName !== 'rn' && cmName !== 'cb' && cmName !== 'subgrid') {
            colStates[cmName] = {
                width: colItem.width,
                hidden: colItem.hidden
            };
        }
    }
    //console.log(name, columnsState);
    if (!config[name]) config[name] = {};
    config[name] = columnsState;
    storage.set('mqtt-admin', config);

}

function restoreGridState(name, colModel) {
    var colItem, i, l = colModel.length, colStates, cmName,
        columnsState = config[name];

    if (columnsState) {
        colStates = columnsState.colStates;
        for (i = 0; i < l; i++) {
            colItem = colModel[i];
            cmName = colItem.name;
            if (cmName !== 'rn' && cmName !== 'cb' && cmName !== 'subgrid') {
                colModel[i] = $.extend(true, {}, colModel[i], colStates[cmName]);
            }
        }
    }
    return columnsState;
}

function resizeGrids() {
    var x = $(window).width();
    var y = $(window).height();
    var y2 = y - $publishPayload.height();

    $gridStatus.setGridWidth(x - 18);
    $gridStatus.setGridHeight(y - 157);

    $('.publish-grid').setGridWidth(x - 36).setGridHeight(y2 - 234);
    $('.subscribe-grid').each(function () {
        var $this = $(this);
        var d = $this.closest('.ui-tabs-panel').find('.subscribe-header').height();
        var y3 = y - d;
        $this.setGridWidth(x - 36).setGridHeight(y3 - 136);
    });

}

$(window).resize(resizeGrids);

$publishPayload.data('y', $publishPayload.outerHeight());

$('#publish').bind('mousemove', function () {
    var $this = $(this);
    var y = $this.outerHeight();
    if (y !== $this.data('y')) {
        resizeGrids();
    }
    $this.data('y', y);
});







/*******************************************************************************
 *  MQTT
 ******************************************************************************/

var mqttFirstConnect = true;
var mqttConnected;

var receiveRetained = true;
var receiveRetainedTimeout;

$mqttStatus.html('<span style="color:red">disconnected</span></span>');

var client;

if (config.mqttHost && config.mqttPort) {
    console.log('url protocol', config.protocol);
    var url = config.protocol + '://' + config.mqttHost + ':' + config.mqttPort;
    console.log('trying to connect to ' + url);

    if (config.server.indexOf(url) === -1) config.server.unshift(url);
    storage.set('mqtt-admin', config);

    var clientId = config.clientId + (config.clientIdSuffix ? '_' + ('00000000' + Math.floor(Math.random() * 0xffffffff).toString(16)).slice(-8) : '');
    $('#mqttClientId').html(clientId);

    $mqttStatus.html('<span style="color:red">disconnected</span> <span style="color:orange">trying to connect to ' + config.protocol + '://' + config.mqttHost + ':' + config.mqttPort + '</span>');
    client = new Paho.MQTT.Client(config.mqttHost, config.mqttPort, '/mqtt', clientId);


    client.onConnectionLost = function (e) {
        mqttConnected = false;
        console.log('mqtt close', e);
        $mqttStatus.html('<span style="color:red">disconnected</span>');
        $host.val(config.mqttHost);
        $port.val(config.mqttPort);
        topicCount = 0;
        setTimeout(function () {
            $dialogSettings.dialog('open');
            mqttConnect();
        }, 500);
    };


    client.onMessageArrived = function (msg) {
        mqttIndicator();

        var topic = msg.destinationName;
        if (topic === '__malformed_utf8') return;
        var payload;

        if (msg.payloadBytes.length > config.maxPayloadSize) {
            payload = '__max_payload_size_exceeded';
        } else {
            payload = msg.payloadString;
        }

        for (var sid in subscriptions) {
            var sub = subscriptions[sid];
            if (sub.mode !== 'stop') {
                for (var i = 0; i < sub.topics.length; i++) {
                    if (topic.match(mqttWildcards(sub.topics[i]))) {
                        sub.count += 1;
                        var row = buildSubscribeRow(topic, payload, sub.colors[i]);
                        row.id = sid + '_' + sub.count;
                        if (sub.mode === 'play') {
                            sub.$grid.jqGrid('addRowData', row.id, row, 'first');
                        } else if (sub.mode === 'pause') {
                            if (!pauseCache[sid]) pauseCache[sid] = [];
                            pauseCache[sid].push(row);
                        }

                        break;
                    }
                }
            }
        }

        var pointer;
        if (typeof data[topic] === 'undefined') {
            // new status - receiving this topic for the first time
            data[topic] = {
                tid: 'sg_row_' + ('00000000' + (++topicCount).toString(16)).slice(-8)
            };

            pointer = topicTree;
            topic.split('/').forEach(function (part) {
                if (typeof pointer[part] === 'undefined') pointer[part] = {};
                pointer = pointer[part];
            });
        }

        data[topic].retained = !!msg.retained;
        if (data[topic].retained) {
            mqttRetainTimeout();
        }
        data[topic].payload = payload;

        var changed = false;

        var obj = {};
        if (typeof payload === 'string' && payload.charAt(0) === '{') {
            try {
                obj = JSON.parse(payload);
                data[topic].payloadObj = obj;
                if (typeof obj.val !== 'undefined') {
                    if (data[topic].val !== obj.val) {
                        data[topic].val = obj.val;
                        changed = true;
                    }
                }

            } catch (e) {
                if (data[topic].payload !== payload) {
                    changed = true;
                }
                data[topic].payloadObj = {};
            }

        } else {
            if (data[topic].payload !== payload) {
                changed = true;
            }
            data[topic].val = payload;
            data[topic].payloadObj = {val: payload};
        }


        if (typeof obj.ts !== 'undefined') {
            data[topic].ts = parseInt(obj.ts, 10);
        } else {
            if (!msg.retain) data[topic].ts = (new Date()).getTime();
        }

        if (typeof obj.lc !== 'undefined') {
            data[topic].lc = parseInt(obj.lc, 10);
        } else {
            if (changed) data[topic].lc = data[topic].ts;
        }


        if (searchPatternRegExp && topic.match(searchPatternRegExp)) {
            var tid = data[topic].tid;
            var cmd = 'setRowData';
            var isNew = false;

            if (isGridStatusRow.indexOf(topic) === -1) {
                isNew = true;
                isGridStatusRow.push(topic);
                cmd = 'addRowData';
            }

            $gridStatus.jqGrid(cmd, tid, buildRow(topic));

            var tmp = $gridStatus.jqGrid('getLocalRow', tid);
            tmp = data;

            if (isNew) $gridStatus.trigger('reloadGrid');

        }
    };
}

function mqttConnect() {
    var connectOptions = {
        onSuccess: function () {
            console.log('mqtt connected');
            mqttConnected = true;

            var url = config.protocol + '://' + config.mqttHost + ':'+ config.mqttPort;
            $mqttStatus.html('<span style="color:green">connected to ' + url + '</span>');
            $dialogSettings.dialog('close');

            console.log('mqtt subscribe #');
            client.subscribe('#');

            console.log('mqtt subscribe $SYS/#');
            client.subscribe('$SYS/#');

            if ($topic.val() !== '') $load_gridStatus.show();
            mqttRetainTimeout();
        }
    };
    console.log('protocol:', config.protocol);
    if (config.protocol === 'wss') connectOptions.useSSL = true;
    if (config.user) connectOptions.userName = config.user;
    if (config.password) connectOptions.password = config.password;

    client.connect(connectOptions);

}

function mqttWildcards(s) {
    return new RegExp('^' + s.replace(/[\-\[\]{}()*?.,\\\^$|\s]/g, "\\$&").replace(/\+/g, '[^/]+').replace(/#$/, '.*') + '$');
}

function mqttRetainTimeout() {
    if (receiveRetainedTimeout) clearTimeout(receiveRetainedTimeout);
    mqttIndicator();
    receiveRetainedTimeout = setTimeout(function () {
        receiveRetainedTimeout = null;
        console.log('mqtt received retained topics');
        if ($topic.val() !== '') buildTable($topic.val());
    }, 300);
}

function mqttDisconnect() {
    if (mqttConnected) {
        mqttConnected = false;
        client.disconnect();
        console.log('mqtt disconnected');
    }
}

var indicatorTimeout = null;

function mqttIndicator() {
    if (indicatorTimeout) {
        clearTimeout(indicatorTimeout);
    }
    $mqttIndicator.show();
    indicatorTimeout = setTimeout(function () {
        indicatorTimeout = null;
        $mqttIndicator.hide();
    }, 250);

}

function mqttPublish(topic, payload, options) {
console.log(topic, payload, options);
    if (!mqttConnected) {
        console.log('trying to publish while not connected');
    } else {
        mqttIndicator();
       client.send(topic, payload, options.qos, options.retain);
    }

    addToHistory(topic, payload, options);
}


/*******************************************************************************
 *  Let's go
 ******************************************************************************/

if (config.mqttHost && config.mqttPort) {
    mqttConnect();
    // if no connection is established after 500ms open settings dialog
    setTimeout(function () {
        if (!mqttConnected) {
            $dialogSettings.dialog('open');
        } else {
            // todo move into tab status activation
            $topic.focus();
        }
    }, 500);
} else {
    $dialogSettings.dialog('open');
}

$('#container').show();
resizeGrids();