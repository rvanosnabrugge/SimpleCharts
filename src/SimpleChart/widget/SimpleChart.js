/**
	SimpleChart
	========================

	@file      : SimpleChart.js
	@author    : Michel Weststrate
	@date      : 09-03-2015
	@copyright : Mendix
	@license   : Please contact our sales department.

	Documentation
	=============


	Open Issues
	===========


	File is best readable with tabwidth = 2;
*/
require({
    packages: [{
        name: 'jquery',
        location: '../../widgets/SimpleChart/widget/lib/flot',
        main: 'jquery.min'
    }]
}, ['dojo/_base/declare', 'mxui/widget/_WidgetBase',
    'jquery', 'SimpleChart/widget/flot', 'SimpleChart/widget/highcharts',
    'dijit/form/DateTextBox', 'dijit/form/NumberTextBox' , 'dijit/form/TextBox', 'dijit/form/CheckBox', 'dijit/form/Button'
    
], function(declare, _WidgetBase, jQuery, flot, highcharts, DateTextBox, NumberTextBox, TextBox, CheckBox, Button) {
    'use strict';

    // Declare widget's prototype.
    return declare('SimpleChart.widget.SimpleChart', [_WidgetBase, mendix.addon._Contextable], {

        //DECLARATION
        inputargs: {
            tabindex: 0,
            wwidth: 400,
            wheight: 400,
            charttype: 'pie',
            caption: '',
            polltime: 0,
            seriesnames: '',
            seriesentity: '',
            seriesconstraint: '',
            seriescategory: '',
            seriesvalues: '',
            seriescolor: '',
            seriesshowpoint: '',
            seriesclick: '',
            seriesaggregate: '',
            xastitle: '',
            yastitle: '',
            yastitle2: '',
            seriesyaxis: '',
            enablezoom: false,
            inverted: false,
            chartprovider: 'flot',
            extraoptions: '',
            showlegend: true,
            showxticks: true,
            showyticks: true,
            showhover: true,
            autorefresh: false,
            dateaggregation: 'none', // or hour/day/month/year
            dateformat: '',
            yunit1: '',
            yunit2: '',
            uselinearscaling: true,
            constraintentity: '',
            filtername: '',
            filterattr: ''
        },

        //IMPLEMENTATION
        dataobject: null,
        series: null,
        usecontext: false,
        chart: null,
        firstrun: true,
        isdate: false, //use dates as x axis?
        isLocalizedDate: true,
        iscategories: false, //use categories as x axis
        categoriesArray: [],
        rangeNode: null,
        refreshing: 0,
        refreshSub: null,

        splitprop: function(prop) {
            return this[prop] != "" ? this[prop].split(";") : [""];
        },

        postCreate: function() {
            mxui.dom.addCss(require.toUrl("SimpleChart/widget/ui/SimpleChart250.css"));
            
            dojo.style(this.domNode, {
                width: this.wwidth + 'px',
                height: this.wheight + 'px'
            });
            dojo.addClass(this.domNode, "SimpleChartOuter");

            //create series object
            this.series = [];
            for (var i = 0; i < this.doesnotmatter2.length; i++) {
                var serie = this.doesnotmatter2[i];
                if (serie.seriesconstraint.indexOf('[%CurrentObject%]') > -1) {
                    this.usecontext = true;
                }
                this.series[i] = serie;
            }

            //create the filters object
            this.filters = [];
            for (var i = 0; i < this.stilldoesntmatter.length; i++) {
                this.filters[i] = this.stilldoesntmatter[i];
            }
           
            //mix chart implementations in as kind of addon, but lazy loaded..
            if (this.chartprovider === 'flot') {
                var chart = new flot();
                dojo.mixin(this, chart);
            } else if (this.chartprovider === 'highcharts') {
                var chart = new highcharts();
                dojo.mixin(this, chart);
            }

            this.categoriesArray = [];

            //create the chart
            this.renderChart();

            //trigger data loading
            this.isresumed = true;
            if (!this.usecontext) {
                this.hascontext = true;
                this.refresh(); //Note: causes charts in dataviews which do not use context to be loaded twice
            } else {
                this.initContext();
            }

            this.start();
            this.createrangeNode();
            this.refreshSub = null;
            //this.loaded();
        },

        start: function() {
            if (this.polltime > 0 && this.refreshhandle == null)
                this.refreshhandle = setInterval(dojo.hitch(this, function() {
                    this.refresh();
                }), this.polltime * 1000);
        },

        stop: function() {
            if (this.refreshhandle != null)
                clearInterval(this.refreshhandle);
            this.refreshhandle = null;
        },

        suspended: function() {
            this.stop();
            this.isresumed = false;
        },

        resumed: function() {
            this.start();
            this.isresumed = true;
            this.refresh();
        },

        applyContext: function(context, callback) {
            logger.debug(this.id + ".applyContext");

            if (this.dataobject && this.autorefresh)
                mx.data.unsubscribe(this.refreshSub);

            if (context && context.getTrackId() != "" && this.usecontext) {
                this.dataobject = context.getTrackId();
                this.hascontext = true;
                this.refresh();

                if (this.autorefresh){
                    this.refreshSub = mx.data.subscribe({
                        guid     : this.dataobject.getGuid(),
                        callback : dojo.hitch(this, this.objectUpdate)
                    });
                }
            } else
                logger.warn(this.id + ".applyContext received empty context");
            callback && callback();
        },

        objectUpdate: function(newobject, callback) {
            this.refresh();
            callback && callback();
        },

        refresh: function() {
            if (!this.isresumed || !this.hascontext)
                return;

            if (this.refreshing > 0) {
                console.log(this.id + " is already busy fetching new data");
                return;
            }

            if (this.waitingForVisible)
                return;

            this.waitingForVisible = true;

            var loadfunc = dojo.hitch(this, function() {
                for (var i = 0; i < this.series.length; i++) {
                    this.loadSerie(i);
                }
                this.waitingForVisible = false;
            });

            if (dojo.marginBox(this.domNode).h == 0) { //postpone update if hidden
                mendix.lang.runOrDelay(
                    loadfunc,
                    dojo.hitch(this, function() {
                        try {
                            return dojo.marginBox(this.domNode).h > 0;
                        } catch (e) {
                            //we would rather like to terminate...
                            return false;
                        }
                    })
                );
            } else {
                loadfunc();
            }
        },

        loadSerie: function(index) {

            if (this.usecontext && !this.dataobject)
                return; //no context yet, abort

            this.refreshing++;
            var serie = this.series[index];

            if (serie.schema == null) {
                serie.schema = {
                    attributes: [],
                    references: {},
                    sort: [
                        [serie.seriescategory, 'asc']
                    ]
                };

                var cat = serie.seriescategory.split("/");
                if (cat.length == 1)
                    serie.schema.attributes.push(serie.seriescategory);
                else {
                    serie.schema.references[cat[0]] = {
                        attributes: [cat[2]]
                    };
                    serie.seriesconstraint += "[" + cat[0] + "/" + cat[1] + "]";
                }

                if (serie.seriesvalues) {
                    var path = serie.seriesvalues.split("/");
                    if (path.length == 1)
                        serie.schema.attributes.push(serie.seriesvalues);
                    else
                        serie.schema.references[path[0]] = {
                            attributes: [path[2]]
                        };
                }
            }

            //execute the get. 
            
            mx.data.get({
                xpath: "//" + serie.seriesentity + this.getActiveConstraint(index) + serie.seriesconstraint.replace(/\[\%CurrentObject\%\]/gi, this.dataobject),
                filter: serie.schema, //TODO: should be schema : serie.schema, but only in 2.5.1 and upward, 
                callback: dojo.hitch(this, this.retrieveData, index),
                //sort: serie.seriescategory,
                error: dojo.hitch(this, function(err) {
                    console.error("Unable to retrieve data for xpath '" + xpath + "': " + err, err);
                })
            });
        },

        getMetaDataPropertyOwner: function(baseObject, attribute) {
            if (attribute.length === 1)
                return baseObject.metaData;
            var sub = baseObject.getChild(attribute[0]);
            if (sub == null || sub._guid == 0)
                throw "Reference to category attribute cannot be empty!";
            return sub.metaData;
        },

        retrieveData: function(seriesindex, objects) {
            try {
                try {
                    var serie = this.series[seriesindex],                    
                    valueattr = serie.seriesvalues ? serie.seriesvalues.split("/") : null,
                    labelattr = serie.seriescategory.split("/");
                    
                    serie.data = [];
                    var rawdata = []; //[[xvalue, yvalue, originalobject]]

                    //aggregate all data to the rawdata object
                    var len = objects.length;
                    for (var i = 0; i < len; i++) {
                        //check the data category type
                        if (i == 0 && this.firstrun) {
                            try {
                                var mdOwner = this.getMetaDataPropertyOwner(objects[i], labelattr);
                                if (mdOwner != null) {
                                    this.firstrun = false;
                                    this.isdate = mdOwner.isDate(labelattr[labelattr.length - 1]);
                                    if (this.isdate)
                                        this.isLocalizedDate = mdOwner.isLocalizedDate(labelattr[labelattr.length - 1]);

                                    this.iscategories = !this.isdate && !mdOwner.isNumber(labelattr[labelattr.length - 1]);
                                }
                            } catch (e) {
                                this.firstrun = true;
                                this.isdate = false;
                                this.iscategories = true;
                            }
                        }

                        //get the x value
                        var x;
                        if (labelattr.length == 1)
                            x = this.dateRound(objects[i].get(serie.seriescategory));
                        else {
                            var sub = objects[i].getChild(labelattr[0]);
                            if (sub == null || sub._guid == 0)
                                x = "(undefined)"
                            else
                                x = this.dateRound(sub.get(labelattr[2]));
                        }

                        //get the y value
                        if (!valueattr) //not defined
                            rawdata.push([x, 1, objects[i]]);
                        else if (valueattr.length == 1) //attr
                            rawdata.push([x, parseFloat(objects[i].get(valueattr[0])), objects[i]]);
                        else { //reference
                            var subs = objects[i].getChildren(valueattr[0]);
                            for (var j = 0; j < subs.length; j++)
                                rawdata.push([x, parseFloat(subs[j].get(valueattr[2])), objects[i]]);
                        }
                    }

                    //loop raw data to aggregate
                    var currenty = [];
                    len = rawdata.length;
                    for (var i = 0; i < len; i++) {
                        var currentx = rawdata[i][0];
                        currenty.push(rawdata[i][1]);

                        if (i < len - 1 && currentx === rawdata[i + 1][0] && serie.seriesaggregate != 'none')
                            continue;
                        else {
                            //calculate the label, which, can be a referred attr...
                            var labelx = "";
                            if (!this.iscategories)
                                labelx = this.getFormattedXValue(currentx);
                            else if (labelattr.length == 1)
                                labelx = mx.parser.formatAttribute(rawdata[i][2], labelattr[0]);
                            else {
                                var sub = rawdata[i][2].getChild(labelattr[0]);
                                if (sub == null || sub._guid == 0)
                                    labelx = "(undefined)"
                                else
                                    labelx = mx.parser.formatAttribute(sub, labelattr[2]);
                            }

                            if (this.iscategories) {
                                var pos = jQuery.inArray(labelx, this.categoriesArray);

                                if (pos < 0) {
                                    pos = this.categoriesArray.length;
                                    this.categoriesArray[pos] = labelx;
                                }

                                if (this.charttype != 'pie') {
                                    currentx = pos;
                                }
                            }

                            var newitem = {
                                index: this.iscategories ? currentx : serie.data.length,
                                origx: this.iscategories ? currentx : parseFloat(currentx),
                                labelx: labelx,
                                guid: rawdata[i][2].getGuid(),
                                y: this.aggregate(serie.seriesaggregate, currenty)
                            };

                            newitem.labely = dojo.trim(this.getFormattedYValue(serie, newitem.y));
                            if (this.charttype == 'pie') { //#ticket 9446, show amounts if pie
                                newitem.labelx += " (" + newitem.labely + ")";

                                this.categoriesArray[pos] = newitem.labelx;
                            }

                            serie.data.push(newitem);
                            currenty = [];
                        }
                    }

                    //sort
                    //this.sortdata(seriesindex);

                    //if (dojo.marginBox(this.domNode).h > 0) //bugfix: do not draw if the element is hidden
                    //   this.renderSerie(seriesindex);

                    serie.loaded = true;

                    this.sortAndRenderSeries();
                } catch (e) {
                    console.error(this.id + " Error while rendering chart data " + e, e);
                }
            } finally {
                this.refreshing--;
            }
        },

        sortAndRenderSeries: function() {
            var allSeriesLoaded = true;
            for (var i in this.series) {
                if (this.series[i].loaded != true) {
                    allSeriesLoaded = false;
                    break;
                }
            }

            if (allSeriesLoaded) {
                this.sortdata();

                if (dojo.marginBox(this.domNode).h > 0) { //bugfix: do not draw if the element is hidden
                    for (var i in this.series) {
                        this.renderSerie(i);
                    }
                }
            }
        },

        sortdata: function() {
            if (this.iscategories) {

                this.categoriesArray.sort();

                for (var seriesindex = 0; seriesindex < this.series.length; seriesindex++) {
                    var serie = this.series[seriesindex];
                    var labelattr = serie.seriescategory.split("/");
                    var attrname = labelattr[labelattr.length - 1];
                    var meta = mx.meta.getEntity(labelattr.length == 1 ? serie.seriesentity : labelattr[1]);

                    //put them in a maps
                    var targetmap = {};
                    dojo.forEach(serie.data, function(item) {
                        targetmap[item.origx] = item;
                    });

                    //create new list
                    var result = [];
                    var i = 0;
                    for (var val in targetmap) {
                        var pos = jQuery.inArray(targetmap[val].labelx, this.categoriesArray);
                        if (pos >= 0) {
                            result.push(targetmap[val]);
                            targetmap[val].index = pos; //update index!
                        } else
                            console.error("Invalid configuration for chart: (" + this.id + "), unable to find " + targetmap[val].labelx + " in the categories array");
                    }

                    serie.data = result;
                }
            }
        },

        aggregate: function(aggregate, vals) {
            var result = 0;
            switch (aggregate) {
                case 'sum':
                case 'logsum':
                    dojo.forEach(vals, function(value) {
                        result += value;
                    });
                    if (aggregate == 'logsum')
                        result = Math.log(result);
                    break;
                case 'count':
                    dojo.forEach(vals, function(value) {
                        result += 1;
                    });
                    break;
                case 'avg':
                    dojo.forEach(vals, function(value) {
                        result += value;
                    });
                    break;
                case 'min':
                    result = Number.MAX_VALUE;
                    dojo.forEach(vals, function(value) {
                        if (value < result)
                            result = value;
                    });
                    break;
                case 'max':
                    result = Number.MIN_VALUE;
                    dojo.forEach(vals, function(value) {
                        if (value > result)
                            result = value;
                    });
                    break;
                case 'none':
                case 'first':
                    result = vals[0];
                    break;
                case 'last':
                    result = vals.length > 0 ? vals[vals.length - 1] : 0;
                    break;
                default:
                    this.showError("Unimplemented aggregate: " + aggregate);
            }
            if (aggregate == "avg")
                return vals.length > 0 ? result / vals.length : 0;
            return result;
        },

        clickCallback: function(serie, itemindex, clientX, clientY) {
            if (this.series[serie].seriesclick) {
                mx.data.action({
                    params       : {
                        actionname : this.series[serie].seriesclick,
                        applyto: 'selection',
                        guids: [this.series[serie].data[itemindex].guid]
                    },
                    error: function() {
                        logger.error(this.id + "error: XAS error executing microflow");
                    }
                });
            }
        },

        uninitialize: function() {
            this.stop();
            this.uninitializeChart();
        },

        showError: function(msg) {
            dojo.empty(this.domNode);
            dojo.html.set(this.domNode, "SimpleChart error: " + msg);
            console.error("SimpleChart error: " + msg);
            return null;
        },

        showWarning: function(msg) {
            console.warn(msg);
        },

        //////// SECTION LABEL FORMATTING

        /** maps a domain X value to a label */
        getFormattedXValue: function(value) {
            if (this.isdate) {
                var date = new Date(value);
                if (!isNaN(date))
                    return this.getFormattedDateTime(date);

                return "(Undefined)";
            }

            if (this.iscategories) { //if categories, than value equals index
                if (value < this.categoriesArray.length)
                    return this.categoriesArray[value];
                return "";
            }
            if (!this.uselinearscaling)
                return dojo.number.round(this.series[0].data[value].origx, 2);
            return dojo.number.round(value, 2);
        },

        /** maps a plot X value to a label */
        getXLabelForValue: function(value) {
            if (this.isdate) {
                var date = new Date(value);
                if (!isNaN(date))
                    return this.getFormattedDateTime(date);

                return "(Undefined)";
            } else if (this.iscategories) {
                if (value < this.categoriesArray.length)
                    return this.categoriesArray[value];
                return "";
            } else if (this.uselinearscaling && !this.iscategories)
                return this.getFormattedXValue(value);
            else {
                for (var i = 0; i < this.series.length; i++) {
                    if (value < this.series[i].data.length)
                        return this.series[i].data[!isNaN(value - 0) ?
                            Math.round(value) :
                            value
                        ].labelx; //value is the index for non linear data!
                    //round is required for flot to map to the closest concrete point in the data. Its a bit annoying though since the label does not match exactly. Should be a better way
                }
            }
            return "";
        },

        getFormattedYValue: function(serie, value) {
            return ("" + dojo.number.round(value, 2)) + " " + (serie.seriesyaxis === true ? this.yunit1 : this.yunit2);
        },


        getFormattedDateTime: function(date) {

            var format = null;
            switch (this.dateformat) {
                case 'fulldate':
                    return date.toLocaleDateString(); /*format = { selector : 'date', datePattern : "y-MM-dd"};*/
                case 'datetime':
                    return date.toLocaleDateString() + " " + dojo.date.locale.format(date, {
                        selector: 'time',
                        timePattern: "HH:mm"
                    }); /*format = { datePattern : "y-MM-dd", timePattern : "HH:mm"};*/
                case 'day':
                    format = {
                        selector: 'date',
                        datePattern: "EEE"
                    };
                    break;
                case 'month':
                    format = {
                        selector: 'date',
                        datePattern: "MMM"
                    };
                    break;
                case 'monthday':
                    format = {
                        selector: 'date',
                        datePattern: "dd MMM"
                    };
                    break;
                case 'year':
                    format = {
                        selector: 'date',
                        datePattern: "y"
                    };
                    break;
                case 'yearmonth':
                    format = {
                        selector: 'date',
                        datePattern: "MMM y"
                    };
                    break;
                case 'weekyear':
                    //format = { selector : 'date', datePattern : "w - y"};
                    return this.getWeekNr(date) + ' - ' + this.getWeekYear(date);
                case 'time':
                    format = {
                        selector: 'time',
                        timePattern: "HH:mm"
                    };
                    break;
                default:
                    this.showError("Unknown dateformat: " + this.dateformat);
            }


            return dojo.date.locale.format(date, format);
        },

        getWeekNr: function(date) {
            date.setHours(0, 0, 0, 0);
            // Thursday in current week decides the year.
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            // January 4 is always in week 1.
            var week1 = new Date(date.getFullYear(), 0, 4);
            // Adjust to Thursday in week 1 and count number of weeks from date to week1.
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        },

        // Returns the four-digit year corresponding to the ISO week of the date.
        getWeekYear: function(date) {
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            return date.getFullYear();
        },


        dateRound: function(x) {
            if (!this.isdate || this.dateaggregation == 'none')
                return x;

            var d = new Date(x);
            if (isNaN(d))
                return x;

            switch (this.dateaggregation) {
                case 'year':
                    d.setMonth(0);
                case 'month':
                    d.setDate(1);
                case 'day':
                    d.setHours(0)
                case 'hour':
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    break;
                case 'week':
                    var distance = 1 - d.getDay();
                    d.setDate(d.getDate() + distance);
                    d.setHours(0)
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    break;
            }

            return d.getTime();
        },

        //////// SECTION FILTER IMPLEMENTATION

        getActiveConstraint: function(index) {
            if (this.series[index].seriesentity != this.constraintentity)
                return "";
            var res = "";
            for (var i = 0; i < this.filters.length; i++) {
                var filter = this.filters[i];
                if (filter.value && filter.value != {} && filter.value != '') {
                    if (filter.filterattr.indexOf("/") > -1) {
                        for (key in filter.value)
                            if (filter.value[key] == true) {
                                var attr = filter.filterattr.split("/");
                                res += "[" + filter.filterattr + " = '" + this.escapeQuotes(key) + "']";
                                break;
                            }
                        continue;
                    }
                    switch (filter.type) {
                        case "Integer":
                        case "DateTime":
                            if (filter.value.start)
                                res += "[" + filter.filterattr + ">=" + filter.value.start + "]";
                            if (filter.value.end)
                                res += "[" + filter.filterattr + "<=" + filter.value.end + "]";
                            break;
                        case "String":
                            if (dojo.isString(filter.value))
                                res += "[contains(" + filter.filterattr + ",'" + this.escapeQuotes(filter.value) + "')]";
                            break;
                        case "Boolean":
                        case "Enum":
                            var enums = "";
                            var all = true; //if all are checked, include null values
                            for (var key in filter.value) {
                                if (filter.value[key] == true)
                                    enums += "or " + filter.filterattr + "= " + (filter.type == "Enum" ? "'" + key + "'" : key) + " ";
                                else
                                    all = false;
                            }
                            if (enums != "" && !all)
                                res += "[" + enums.substring(2) + "]";
                            break;
                        default:
                            return this.showError("Type not supported in filters: " + filter.type);
                    }
                }
            }
            return res;
        },

        clearConstraint: function() {
            for (var i = 0; i < this.filters.length; i++) {
                var filter = this.filters[i];
                switch (filter.type) {
                    case "Boolean":
                    case "Enum":
                        for (var key in filter.value)
                            filter.value[key] = true;
                        break;
                    default:
                        filter.value = {};
                        break;
                }
            }

            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                if (input.declaredClass == "dijit.form.CheckBox")
                    input.setValue(true);
                else if (input.nodeName == "SELECT")
                    input.value = '';
                else
                    input.setValue(null);
            }

            this.refresh();
        },

        createrangeNode: function() {
            if (this.constraintentity == "")
                return;

            var open = mxui.dom.create('span', {
                'class': "SimpleChartFilterOpen"
            }, "(filter)");
            this.connect(open, "onclick", function() {
                dojo.style(this.rangeNode, {
                    display: 'block'
                });
            });
            dojo.place(open, this.domNode);

            var n = this.rangeNode = mxui.dom.create('div', {
                'class': 'SimpleChartRangeNode'
            });
            dojo.place(n, this.domNode);

            //retrieve the type and then construct the inputs
            
            this.addFilterInputs(mx.meta.getEntity( this.constraintentity));
            
        },

        inputs: null,

        addFilterInputs: function(meta) {
            try {
                this.inputs = [];

                var close = mxui.dom.create('span', {
                    'class': "SimpleChartFilterClose"
                }, "x");
                this.connect(close, "onclick", this.closeFilterBox);
                dojo.place(close, this.rangeNode);

                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];

                    filter.value = {};
                    var catNode = mxui.dom.create('div', {
                        'class': "SimpleChartFilterCat"
                    });
                    dojo.place(catNode, this.rangeNode);

                    if (filter.filterattr.indexOf("/") > -1) {
                        if (this.usecontext)
                            this.connect(this, 'applyContext', dojo.hitch(this, this.addReferencedFilterAttr, filter, catNode)); //wait for context
                        else
                            this.addReferencedFilterAttr(filter, catNode)
                        continue;
                    }

                    dojo.place(mxui.dom.create('span', {
                        'class': "SimpleChartFilterLabel"
                    }, filter.filtername), catNode);                    
                    filter.type = meta.getAttributeType(filter.filterattr);

                    if (meta.isDate(filter.filterattr))
                        this.createDateRangeSelector(catNode, filter);

                    else if (meta.isNumber(filter.filterattr))
                        this.createNumberRangeSelector(catNode, filter);

                    else if (meta.isEnum(filter.filterattr)) {
                        var enums = meta.getEnumMap(filter.filterattr);
                        if (enums.length < 5) {
                            for (var j = 0; j < enums.length; j++)
                                this.createCheckbox(catNode, filter, enums[j].key, enums[j].caption);
                        } else {
                            this.createDropdown(catNode, filter, enums);
                        }
                    } else if (meta.isBoolean(filter.filterattr)) {
                        this.createCheckbox(catNode, filter, "true()", "True");
                        this.createCheckbox(catNode, filter, "false()", "False");
                    } else if (filter.type == "String") {
                        var widget = new TextBox();
                        widget.onChange = dojo.hitch(this, function(filter, value) {
                            filter.value = value;
                        }, filter);
                        dojo.place(widget.domNode, catNode);
                        this.inputs.push(widget);
                    } else
                        this.showError("Unimplemented filter attribute type: " + filter.type);
                }

                for (var i = 0; i < this.inputs.length; i++)
                    dojo.addClass(this.inputs[i].domNode, "SimpleChartFilterInput");

                var update = new Button({
                    'class': "btn mx-button btn-default SimpleChartFilterUpdate",
                    label: "update",
                    onClick: dojo.hitch(this, function() {
                        this.refresh();
                        this.closeFilterBox();
                    })
                });
                dojo.place(update.domNode, this.rangeNode);
                var clear = new Button({
                    'class': "btn mx-button btn-default SimpleChartFilterClear",
                    label: "clear",
                    onClick: dojo.hitch(this, this.clearConstraint)
                });
                dojo.place(clear.domNode, this.rangeNode);
            } catch (e) {
                this.showError("Unable to create filter inputs: " + e);
            }
        },

        addReferencedFilterAttr: function(filter, catNode) {
            if (!this.dataobject && this.usecontext)
                return; //we are waiting for context...

            dojo.empty(catNode);

            dojo.place(mxui.dom.create('span', {
                'class': "SimpleChartFilterLabel"
            }, filter.filtername), catNode);

            var attrparts = filter.filterattr.split("/");
            var ref = attrparts[0];
            var entity = attrparts[1];
            var attr = attrparts[2];

            var dataconstraint = "";

            for (var i = 0; i < this.series.length; i++)
                if (this.series[i].seriesentity == this.constraintentity)
                    dataconstraint += this.series[i].seriesconstraint; //apply constraint of the data to the selectable items.

            mx.data.get({
                xpath: ("//" + entity + "[" + ref + "/" + this.constraintentity + dataconstraint + "]").replace(/\[\%CurrentObject\%\]/gi, this.dataobject),
                filter: {
                    attributes: [attr],
                    references: {},
                    sort: [
                        [attr, 'asc']
                    ]
                },
                callback: dojo.hitch(this, this.retrieveFilterData, filter, catNode),
                error: dojo.hitch(this, this.showError)
            });
        },

        retrieveFilterData: function(filter, catNode, objects) {
            var attr = filter.filterattr.split("/")[2];
            var enums = dojo.map(objects, function(item) {
                var val = item.get(attr);
                return {
                    key: val,
                    caption: val
                }
            }, this);
            this.createDropdown(catNode, filter, enums);
        },

        closeFilterBox: function() {
            dojo.style(this.rangeNode, {
                display: 'none'
            });
        },

        createCheckbox: function(catNode, filter, value, caption) {
            filter.value[value] = true;
            var wrapper = mxui.dom.create('div');
            var checkBox = new CheckBox({
                value: value,
                checked: true
            });
            dojo.place(checkBox.domNode, wrapper);
            dojo.place(mxui.dom.create('label', {
                "class": "SimpleChartFilterCheckboxLabel"
            }, caption), wrapper);
            checkBox.onChange = dojo.hitch(this, function(filter, value, checked) {
                filter.value[value] = checked;
            }, filter, value);
            this.inputs.push(checkBox);
            dojo.place(wrapper, catNode);
        },

        createDropdown: function(catNode, filter, valueArr) {
            var selectNode = mxui.dom.create('select');
            var optionNode = mxui.dom.create('option', {
                value: ''
            }, '');
            selectNode.appendChild(optionNode);
            for (var i = 0; i < valueArr.length; i++)
                if (!filter.value[valueArr[i].key]) { //avoid items to appear twice
                    var optionNode = mxui.dom.create('option', {
                        value: valueArr[i].key
                    }, valueArr[i].caption);
                    filter.value[valueArr[i].key] = false;
                    selectNode.appendChild(optionNode);
                }

            dojo.place(selectNode, catNode);
            this.connect(selectNode, "onchange", dojo.hitch(selectNode, function(filter, e) {
                for (var key in filter.value)
                    filter.value[key] = key == this.value;
            }, filter));
            selectNode['domNode'] = selectNode;
            this.inputs.push(selectNode);
        },

        createDateRangeSelector: function(catNode, filter) {
            //create two date inputs

            var widget = new DateTextBox({});
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.start = value == null ? null : value.getTime();
            }, filter);
            dojo.place(widget.domNode, catNode);
            this.inputs.push(widget);

            widget = new DateTextBox({});
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.end = value == null ? null : value.getTime();
            }, filter);
            dojo.place(widget.domNode, catNode);
            this.inputs.push(widget);
        },

        createNumberRangeSelector: function(catNode, filter) {
            var widget = new NumberTextBox();
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.start = value;
            }, filter);
            dojo.place(widget.domNode, catNode);
            this.inputs.push(widget);

            widget = new NumberTextBox();
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.end = value;
            }, filter);
            dojo.place(widget.domNode, catNode);
            this.inputs.push(widget);
        },

        escapeQuotes: function(value) { //MWE: fix the fact that mxcompat is not correct for escapeQuotes in 3.0.0.
            if ((typeof(mxui) != "undefined") && mxui.html)
                return mxui.html.escapeQuotes(value);
            else
                return mx.parser.escapeQuotesInString(value);
        },

        objectmix: function(base, toadd) {
            //MWE: because console.dir(dojo.mixin({ a : { b : 3 }}, { a : { c : 5 }})); -> { a : { c : 5 }}, but i want to keep b
            if (toadd) {
                /*console.log("in");
                console.dir(base);
                console.log("add");
                console.dir(toadd);*/
                for (var key in toadd) {
                    if ((key in base) &&
                        ((dojo.isArray(toadd[key]) != dojo.isArray(base[key])) ||
                            (dojo.isObject(toadd[key]) != dojo.isObject(base[key]))))
                        throw "Cannot mix object properties, property '" + key + "' has different type in source and destination object";

                    //mix array
                    if (key in base && dojo.isArray(toadd[key])) { //base is checked in the check above
                        var src = toadd[key];
                        var target = base[key];
                        for (var i = 0; i < src.length; i++) {
                            if (i < target.length) {
                                if (dojo.isObject(src[i]) && dojo.isObject(target[i]))
                                    this.objectmix(target[i], src[i]);
                                else
                                    target[i] = src[i];
                            } else
                                target.push(src[i]);
                        }
                    }
                    //mix object
                    else if (key in base && dojo.isObject(toadd[key])) //base is checked in the check above
                        this.objectmix(base[key], toadd[key]);
                    //mix primitive
                    else
                        base[key] = toadd[key];
                }
            }
            /*console.log("out");
            console.dir(base);*/
        }
    });
});;