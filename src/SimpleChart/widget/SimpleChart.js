/**
	SimpleChart
	========================

	@file		SimpleChart.js
	@author		Michel Weststrate
	@date		09-03-2015
	@copyright	Mendix
	@license	Please contact our sales department.

	Documentation
	=============


	Open Issues
	===========


	File is best readable with tabwidth = 4;
*/
require({
    packages: [
        { name: 'jquery', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery'
      }
    ]
},[
  "dojo/_base/declare",
  "mxui/widget/_WidgetBase",
  "mxui/mixin/_Contextable",
  "SimpleChart/widget/flot",
  "SimpleChart/widget/highcharts",
  "dijit/form/DateTextBox",
  "dijit/form/NumberTextBox",
  "dijit/form/TextBox",
  "dijit/form/CheckBox",
  "dijit/form/Button",
  "jquery"

], function(declare, _WidgetBase, _Contextable, Flot, Highcharts, DateTextBox, NumberTextBox, TextBox, CheckBox, Button, jquery) {
    "use strict";
    console.dir(jquery);
    var $ = jquery.noConflict(true);

    // Declare widget"s prototype.
    return declare("SimpleChart.widget.SimpleChart", [_WidgetBase, _Contextable], {

        //DECLARATION
        inputargs: {
            // Chart
            chartprovider: "highcharts",
            charttype: "pie",
            wwidth: 400,
            wheight: 800,
            caption: "",
            // Chart series - Appearance
            seriesnames: "",
            seriesyaxis: "",
            seriescolor: "black",
            // seriescharttype
            seriesshowpoint: "",
            //dashStyle: "", //insert jibbe
            //step: "", //insert jibbe
            seriesstack: "", //insert jibbe
            plotonxaxis: false, //insert Wouter

            // Chart series - Entity
            seriesentity: "",
            seriesconstraint: "",
            seriescategory: "",
            seriesvalues: "",
            seriesaggregate: "",

            // Chart series - Interaction
            seriesclick: "",

            // Chart series - Dynamic series
            // seriesdynamicserieentity
            // seriesdynamicserieattribute
            // seriesdynamicserieconstraint

            // Chart series - Split series
            splitseries_enabled: false,
            // splitseries_attribute
            // splitseries_value

            // Chart - Customizing
            // seriesextraoptions
            markerradius: "", //insert Wouter
            markersymbol: "", //insert Wouter
            AddSuffix: false, //insert Wouter

            // Chart x axis
            xastitle: "",
            showxticks: true,
            dateaggregation: "none", // or hour/day/month/year
            dateformatXaxis: '',
            dateformat: "",
            uselinearscaling: true,
			serieslimitamount: false,
			serieslimitamountvalue: "",

            // Chart y axis
            yastitle: "",
            showyticks: true,
            EnableyAxisMin: false, //insert Wouter
            yAxisMin: 0, //insert Wouter
            Absolute: false, //insert Wouter
            yunit1: "",
            // yunit1prefix
            yastitle2: "",
            yunit2: "",

            // Filter
            constraintentity: "",
            filtername: "",
            filterattr: "",

            // Appearance
            showlegend: true,
            showhover: true,
            showcrosshairs: false,
            enablezoom: false,
            sharedtooltip: false,
            autorefresh: false,
            polltime: 0,
            inverted: false,
            listentogrid: false,
            stacking: "", //insert jibbe
			sparkline: false, //insert Wouter

            // Plotbands
            enablePlotbands: false,
            plotBandEntity: "",
            highRedEnd: 100,
            highRedBegin: 80,
            greenEnd: 60,
            greenBegin: 40,
            lowRedEnd: 20,
            lowRedBegin: 0,

			// Zones
			enableZones: false,


            // Customizing
            extraoptions: "",
            debugging: false, //insert jibbe

            // Common
            tabindex: 0,

            // Other (not used in this version of SimpleChart)
            // exporting: false, //insert jibbe
            // pie_datalabelsdistance: "", //insert jibbe
            // pie_showdatalabels: "", //insert jibbe
            // pie_semicircledonutchart: true, //insert jibbe
            // pie_3ddepth: "", //insert jibbe
            // pie_showlabelspercentage: 0,// insert jibbe
            // pie_colors: "", //insert jibbe
            column_pointpadding: "", //insert jibbe
            column_grouppadding: "", //insert jibbe
            column_borderwidth: "", //insert jibbe
            // column_3ddepth: "", //insert jibbe
            // enable_3d: false, //insert jibbe
            useUTC: true, //insert jibbe
            // yAxisGauge: "",// insert jibbe
        },

        //IMPLEMENTATION
        dataobject: null,
        series: null,
        usecontext: true,
        chart: null,
        firstrun: true,
        isdate: false, //use dates as x axis?
        isLocalizedDate: true,
        iscategories: false, //use categories as x axis
        categoriesArray: [],
        rangeNode: null,
        refreshing: 0,
        refreshSub: null,
        // contextGuid : null,
        // splits	: null,
        // refs : null,
        // schema : null,

        green: "#40A3A1", //Hortilux-Blue
        // green: "rgba(176, 198, 51, 0.60)", //Hortilux nieuwe huisstijl
        orange: "#E6B229", //Hortilux-Gold
        red: "#C42727", //Hortilux-Red

        splitprop: function(prop) {
            return this[prop] !== "" ? this[prop].split(";") : [""];
        },

        postCreate: function() {
            mxui.dom.addCss(require.toUrl("SimpleChart/widget/ui/SimpleChart250.css"));

            dojo.style(this.domNode, {
                width: this.wwidth,
                height: this.wheight,
            });

            dojo.addClass(this.domNode, "SimpleChartOuter");

            //create series object
            this.series = [];
            for (var i = 0; i < this.doesnotmatter2.length; i++) {
                var serie = this.doesnotmatter2[i];
                if (serie.seriesconstraint.indexOf("[%CurrentObject%]") > -1) {
                    this.usecontext = true;
                }
                this.series[i] = serie;
            }

            //create the filters object
            this.filters = [];
            for (var j = 0; j < this.stilldoesntmatter.length; j++) {
                this.filters[j] = this.stilldoesntmatter[j];
            }

            //mix chart implementations in as kind of addon, but lazy loaded..
            var chart;
            if (this.chartprovider === "flot") {
                chart = new Flot();
                dojo.mixin(this, chart);
            } else if (this.chartprovider === "highcharts") {
                chart = new Highcharts();
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
            console.dir(this.series);
        },

        start: function() {
            if (this.polltime > 0 && !this.refreshhandle)
                this.refreshhandle = setInterval(dojo.hitch(this, function() {
                    this.refresh();
                }), this.polltime * 1000);
        },

        stop: function() {
            if (this.refreshhandle !== null)
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

        resize: function() {

        },

        applyContext: function(context, callback) {
            logger.debug(this.id + ".applyContext");

            if (this.dataobject && this.autorefresh)
                mx.data.unsubscribe(this.refreshSub);

            if (context && context.getTrackId() !== "" && this.usecontext) {
                this.dataobject = context.getTrackId();
                this.getListObjects(this.dataobject);
                this.hascontext = true;
                this.refresh();

                if (this.autorefresh) {
                    this.refreshSub = mx.data.subscribe({
                        guid: this.dataobject,
                        callback: dojo.hitch(this, this.objectUpdate)
                    });
                }
            } else {
                logger.warn(this.id + ".applyContext received empty context");
            }
            if (callback) {
                callback();
            }
        },

        loadSchema: function(attr, name) {
            if (attr !== "") {
                this.splits[name] = attr.split("/");
                if (this.splits[name].length > 1)
                    if (this.refs[this.splits[name][0]] && this.refs[this.splits[name][0]].attributes) {
                        this.refs[this.splits[name][0]].attributes.push(this.splits[name][2]);
                    } else {
                        this.refs[this.splits[name][0]] = {
                            attributes: [this.splits[name][2]]
                        };
                    }
                else {
                    this.schema.push(attr);
                }
            }
        },
        getListObjects: function(contextguid, callback) {

            var xpathString = "";
            // TODO JH: Add plotband enabled filter
            if (contextguid > 0) {
                xpathString = "//" + this.plotBandEntity + "[id=" + contextguid + "]";
            } else {
                xpathString = "//" + this.plotBandEntity;
            }
            this.schema = [];
            this.refs = {};
            this.splits = [];

            this.loadSchema(this.greenBegin, "greenBegin");
            this.loadSchema(this.greenEnd, "greenEnd");
            this.loadSchema(this.lowRedBegin, "lowRedBegin");
            this.loadSchema(this.lowRedEnd, "lowRedEnd");
            this.loadSchema(this.highRedBegin, "highRedBegin");
            this.loadSchema(this.highRedEnd, "highRedEnd");

			for(var i =0;i<this.series.length;i++){
				if (this.series[i].enableZones){
					this.loadSchema(this.series[i].zoneHighRedEnd,"");// "serie"+i+
					this.loadSchema(this.series[i].zoneHighOrangeEnd,"");// "serie"+i+
					this.loadSchema(this.series[i].zoneLowGreenEnd,"");// "serie"+i+
					this.loadSchema(this.series[i].zoneLowOrangeEnd,"");// "serie"+i+
					this.loadSchema(this.series[i].zoneLowRedEnd,"");// "serie"+i+
				}
			}

            mx.data.get({
                xpath: xpathString,
                filter: {
                    attributes: this.schema,
                    references: this.refs
                },
                callback: dojo.hitch(this, this.processObjectsList, callback),
                error: dojo.hitch(this, function(err) {
                    console.error("SimpleCharts: Unable to retrieve data: " + err);
                })
            });
        },
        processObjectsList: function(callback, objectsArr) {
            this.objects = this.parseObjects(objectsArr);

            this.hascontext = true;
            this.refresh();

            if (this.autorefresh) {
                this.refreshSub = mx.data.subscribe({
                    guid: this.dataobject,
                    callback: dojo.hitch(this, this.objectUpdate)
                });
            }
            if (callback && typeof(callback) === "function") {
                callback();
            }
        },
        parseObjects: function(objs) {
            var newObjs = [];
            for (var i = 0; i < objs.length; i++) {
                var newObj = {};
                var entity = objs[i].getEntity();
                var entityString = entity.substr(entity.indexOf(".") + 1); // added to have type of geoobject available when plotting
                newObj.type = entityString; // first checkref on all generic attributes of geoobject
                newObj.lowRedBegin = this.checkRef(objs[i], "lowRedBegin", this.lowRedBegin);
                newObj.lowRedEnd = this.checkRef(objs[i], "lowRedEnd", this.lowRedEnd);

                newObj.greenBegin = this.checkRef(objs[i], "greenBegin", this.greenBegin);
                newObj.greenEnd = this.checkRef(objs[i], "greenEnd", this.greenEnd);

                newObj.highRedBegin = this.checkRef(objs[i], "highRedBegin", this.highRedBegin);
                newObj.highRedEnd = this.checkRef(objs[i], "highRedEnd", this.highRedEnd);

				for(var j =0;j<this.series.length;j++){
					if (this.series[j].enableZones){
						this.series[j].zoneHighRedEndValue =  this.checkRef(objs[i], "zoneHighRedEnd", this.series[j].zoneHighRedEnd);
						this.series[j].zoneHighOrangeEndValue =  this.checkRef(objs[i], "zoneHighOrangeEnd", this.series[j].zoneHighOrangeEnd);
						this.series[j].zoneLowGreenEndValue =  this.checkRef(objs[i], "zoneLowGreenEnd", this.series[j].zoneLowGreenEnd);
						this.series[j].zoneLowOrangeEndValue =  this.checkRef(objs[i], "zoneLowOrangeEnd", this.series[j].zoneLowOrangeEnd);
						this.series[j].zoneLowRedEndValue =  this.checkRef(objs[i], "zoneLowRedEnd", this.series[j].zoneLowRedEnd);
					}
				}

                newObj.guid = objs[i].getGuid();
                newObjs.push(newObj);
            }
            return newObjs;
        },
        checkRef: function(obj, attr, nonRefAttr) {
            if (this.splits && this.splits[attr] && this.splits[attr].length > 1) {
                var subObj = obj.getChildren(this.splits[attr][0]);
                return (subObj.length > 0) ? subObj[0].get(this.splits[attr][2]) : "";
            } else {
                return obj.get(nonRefAttr);
            }
        },




        objectUpdate: function(newobject, callback) {
            this.refresh();
            if (callback) {
                callback();
            }
        },

        refresh: function() {
            if (!this.isresumed || !this.hascontext)
                return;

            if (this.refreshing > 0) {
                //console.log(this.id + " is already busy fetching new data");
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

            if (dojo.marginBox(this.domNode).h === 0) { //postpone update if hidden
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

            if (!serie.schema) {
                serie.schema = {
                    attributes: [],
                    references: {},
                    sort: [
                        [serie.seriescategory, "asc"]
                    ]
                };

                var cat = serie.seriescategory.split("/");
                if (cat.length === 1)
                    serie.schema.attributes.push(serie.seriescategory);
                else {
                    serie.schema.references[cat[0]] = {
                        attributes: [cat[2]]
                    };
                    serie.seriesconstraint += "[" + cat[0] + "/" + cat[1] + "]";
                }

                if (serie.seriesvalues) {
                    var path = serie.seriesvalues.split("/");
                    if (path.length === 1)
                        serie.schema.attributes.push(serie.seriesvalues);
                    else
                        serie.schema.references[path[0]] = {
                            attributes: [path[2]]
                        };
                }









                // JH: Add to schema to retrieve shadow-y attribute
                if (serie.splitseries_enabled && serie.splitseries_attribute && serie.splitseries_attribute !== "") {
                    serie.schema.attributes.push(serie.splitseries_attribute);
                }

            }




            //execute the get.

            var xPath = "//" + serie.seriesentity + this.getActiveConstraint(index) + serie.seriesconstraint.replace(/\[\%CurrentObject\%\]/gi, this.dataobject);

			var filter = "";
            if (serie.serieslimitamount) {
                filter = {	sort: [
								[serie.seriescategory, "desc"]
								],
							amount: serie.serieslimitamountvalue
							};
            } else {
				filter = serie.schema;
            }

			mx.data.get({
                xpath: xPath,
                filter: filter, //TODO: should be schema: serie.schema, but only in 2.5.1 and upward,
                sort: [
								[serie.seriescategory, "asc"]
								],
				callback: dojo.hitch(this, this.retrieveData, index),
				//sort: serie.seriescategory,
                error: dojo.hitch(this, function(err) {
                    console.error("Unable to retrieve data for xpath '" + xPath + "': " + err, err);
                })
            });
        },

        getMetaDataPropertyOwner: function(baseObject, attribute) {
            if (attribute.length === 1)
                return baseObject.metaData;
            var sub = baseObject.getChild(attribute[0]);
            if (!sub || sub._guid === 0)
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
                        if (i === 0 && this.firstrun) {
                            try {
                                var mdOwner = this.getMetaDataPropertyOwner(objects[i], labelattr);
                                if (mdOwner !== null) {
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
                        if (labelattr.length === 1)
                            x = this.dateRound(objects[i].get(serie.seriescategory));
                        else {
                            var sub = objects[i].getChild(labelattr[0]);
                            if (!sub || sub._guid === 0) {
                                x = "(undefined)";
                            } else {
                                x = this.dateRound(sub.get(labelattr[2]));
                            }
                        }

                        //get the y value
                        if (!valueattr) //not defined
                            rawdata.push([x, 1, objects[i]]);
                        else if (valueattr.length === 1) //attr
                            rawdata.push([x, parseFloat(objects[i].get(valueattr[0])), objects[i]]);
                        else { //reference
                            var subs = objects[i].getChildren(valueattr[0]);
                            for (var j = 0; j < subs.length; j++) {
                                rawdata.push([x, parseFloat(subs[j].get(valueattr[2])), objects[i]]);
                            }
                        }
                    }

                    //loop raw data to aggregate
                    var currenty = [];
                    len = rawdata.length;

                    for (var i = 0; i < len; i++) {
                        var currentx = rawdata[i][0];
                        currenty.push(rawdata[i][1]);

                        if (i < len - 1 && currentx === rawdata[i + 1][0] && serie.seriesaggregate !== "none")
                            continue;
                        else {
                            //calculate the label, which, can be a referred attr...
                            var labelx = "";
                            if (!this.iscategories)
                                labelx = this.getFormattedXValue(currentx);
                            else if (labelattr.length === 1)
                                labelx = mx.parser.formatAttribute(rawdata[i][2], labelattr[0]);
                            else {
                                var sub = rawdata[i][2].getChild(labelattr[0]);
                                if (sub._guid === 0)
                                    labelx = "(undefined)";
                                else
                                    labelx = mx.parser.formatAttribute(sub, labelattr[2]);
                            }

                            // Determine whether this datapoint requires the secondary style
                            var sy = false;
                            if (serie.splitseries_enabled) {
                                // Get the splitattribute value
                                var sy_val = rawdata[i][2].get(serie.splitseries_attribute);
                                var sy_lim = serie.splitseries_value;
                                // TODO JH: Possibly insert operator here, e.g. sy_lim sy_operator sy_value
                                sy = eval("sy_val == sy_lim");
                            }

                            var pos;
                            if (this.iscategories) {
                                pos = $.inArray(labelx, this.categoriesArray);

                                if (pos < 0) {
                                    pos = this.categoriesArray.length;
                                    this.categoriesArray[pos] = labelx;
                                }

                                if (this.charttype !== "pie") {
                                    currentx = pos;
                                }
                            }

                            var yval = "";
                            var ymin = "";
                            if (this.EnableyAxisMin) {
                                ymin = this.yAxisMin;
                            } else if (this.chart) {
                                ymin = this.chart.yAxis[0].getExtremes().min;
                            }

                            if (serie.plotonxaxis) {
                                yval = ymin;
                            } else {
                                yval = this.Absolute ? Math.abs(this.aggregate(serie.seriesaggregate, currenty)) : this.aggregate(serie.seriesaggregate, currenty);
                            }

                            var newitem = {
                                index: this.iscategories ? currentx : serie.data.length,
                                origx: this.iscategories ? currentx : parseFloat(currentx),
                                labelx: labelx,
                                guid: rawdata[i][2].getGuid(),
                                //y: this.aggregate(serie.seriesaggregate, currenty)


                                origy: this.aggregate(serie.seriesaggregate, currenty),
                                y: yval,
                                //y: this.Absolute ? Math.abs(this.aggregate(serie.seriesaggregate, currenty)): this.aggregate(serie.seriesaggregate, currenty),
                                shadowy: sy
                            };

                            // 16112015 - Insert Wouter: origy will not be made absolute and is used in labely
                            newitem.labely = dojo.trim(this.getFormattedYValue(serie, newitem.origy));
                            //newitem.labely = dojo.trim(this.getFormattedYValue(serie, newitem.y));




                            if (this.charttype === "pie" && pos >= 0) { //#ticket 9446, show amounts if pie
                                newitem.labelx += " (" + newitem.labely + ")";
                                this.categoriesArray[pos] = newitem.labelx;
                            }

                            serie.data.push(newitem);
                            currenty = [];
                        }
                    }

                    //sort
                    // this.sortdata(seriesindex);
                    //
                    // if (dojo.marginBox(this.domNode).h > 0) //bugfix: do not draw if the element is hidden
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
                if (this.series[i].loaded !== true) {
                    allSeriesLoaded = false;
                    break;
                }
            }

            if (allSeriesLoaded) {
                this.sortdata();

                if (dojo.marginBox(this.domNode).h > 0) { //bugfix: do not draw if the element is hidden
                    for (var s in this.series) {
                        this.renderSerie(s);
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
                    var meta = mx.meta.getEntity(labelattr.length === 1 ? serie.seriesentity : labelattr[1]);

                    //put them in a maps
                    var targetmap = {};
                    dojo.forEach(serie.data, function(item) {
                        targetmap[item.origx] = item;
                    });

                    //create new list
                    var result = [];
                    var i = 0;
                    for (var val in targetmap) {
                        var pos = $.inArray(targetmap[val].labelx, this.categoriesArray);
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
                case "sum":
                case "logsum":
                    dojo.forEach(vals, function(value) {
                        result += value;
                    });
                    if (aggregate === "logsum")
                        result = Math.log(result);
                    break;
                case "count":
                    dojo.forEach(vals, function(value) {
                        result += 1;
                    });
                    break;
                case "avg":
                    dojo.forEach(vals, function(value) {
                        result += value;
                    });
                    break;
                case "min":
                    result = Number.MAX_VALUE;
                    dojo.forEach(vals, function(value) {
                        if (value < result)
                            result = value;
                    });
                    break;
                case "max":
                    result = Number.MIN_VALUE;
                    dojo.forEach(vals, function(value) {
                        if (value > result)
                            result = value;
                    });
                    break;
                case "none":
                case "first":
                    result = vals[0];
                    break;
                case "last":
                    result = vals.length > 0 ? vals[vals.length - 1] : 0;
                    break;
                default:
                    this.showError("Unimplemented aggregate: " + aggregate);
            }
            if (aggregate === "avg")
                return vals.length > 0 ? result / vals.length : 0;
            return result;
        },

        clickCallback: function(serie, itemindex, clientX, clientY) {
            if (this.series[serie].seriesclick) {
                mx.data.action({
                    params: {
                        actionname: this.series[serie].seriesclick,
                        applyto: "selection",
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
            if (this.listentogrid) {
                var date = new Date(value);
                if (!isNaN(date))
                    return date.toLocaleDateString() + " " + dojo.date.locale.format(date, {
                        selector: "time",
                        timePattern: "HH:mm"
                    }); /*format = { datePattern : "y-MM-dd", timePattern : "HH:mm"};*/

                return "(Undefined)";
            } else if (this.isdate) {
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

		/** maps a plot X value to a label */
        getXLabelForValueXaxis: function(value) {
            if (this.listentogrid) {
                var date = new Date(value);
                if (!isNaN(date))
                    return date.toLocaleDateString() + " " + dojo.date.locale.formatXaxis(date, {
                        selector: "time",
                        timePattern: "HH:mm"
                    }); /*format = { datePattern : "y-MM-dd", timePattern : "HH:mm"};*/

                return "(Undefined)";
            } else if (this.isdate) {
                var date = new Date(value);
                if (!isNaN(date))
                    return this.getFormattedDateTimeXaxis(date);

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

        //getFormattedYValue: function(serie, value) {
        //  return ("" + dojo.number.round(value, 2)) + " " + (serie.seriesyaxis === true ? this.yunit1: this.yunit2);
        //},


        // 2015-08-09 - Wouter van Stralen: getFormattedYValue aangepast om unit voor of achter de waarde te plaatsen
        getFormattedYValue: function(serie, value) {
            if (serie.AddSuffix) {
                if (this.yunit1prefix === true && value >= 0) {
                    return (serie.seriesyaxis === true ? this.yunit1 : this.yunit2) + (dojo.number.round(value, 2)) + "<b> (i)</b>";
                } else if (this.yunit1prefix === true && value < 0) {
                    return (serie.seriesyaxis === true ? this.yunit1 : this.yunit2) + Math.abs((dojo.number.round(value, 2))) + "<b> (c)</b>";
                } else if (this.yunit1prefix === false && value >= 0) {
                    return (dojo.number.round(value, 2)) + (serie.seriesyaxis === true ? this.yunit1 : this.yunit2) + "<b> (i)</b>";
                } else {
                    return Math.abs((dojo.number.round(value, 2))) + (serie.seriesyaxis === true ? this.yunit1 : this.yunit2) + "<b> (c)</b>";
                }
            } else {
                if (this.yunit1prefix === true) {
                    return (serie.seriesyaxis === true ? this.yunit1 : this.yunit2) + (dojo.number.round(value, 2));
                } else {
                    return (dojo.number.round(value, 2)) + (serie.seriesyaxis === true ? this.yunit1 : this.yunit2);
                }
            }
        },

        getFormattedDateTime : function( date ) {

		var format = null;
		switch(this.dateformat) {
			case 'fulldate':
				return date.toLocaleDateString(); /*format = { selector : 'date', datePattern : "y-MM-dd"};*/
			case 'datetime':
				return date.toLocaleDateString() + " " + dojo.date.locale.format(date, { selector : 'time', timePattern : "HH:mm"} ); /*format = { datePattern : "y-MM-dd", timePattern : "HH:mm"};*/
			case 'day':
				format = { selector : 'date', datePattern : "EEE d MMM"};
				break;
			case 'month':
				format = { selector : 'date', datePattern : "MMM"};
				break;
			case 'monthday':
				format = { selector : 'date', datePattern : "dd MMM"};
				break;
			case 'year':
				format = { selector : 'date', datePattern : "y"};
				break;
			case 'yearmonth':
				format = { selector : 'date', datePattern : "MMM y"};
				break;
			case 'daymonthyeartime':
				format = { selector : 'date', datePattern : "dd MMM y HH:mm"}
				break;
			case 'weekyear':
				//format = { selector : 'date', datePattern : "w - y"};
				return this.getWeekNr(date) + ' - ' + this.getWeekYear(date);
			case 'time':
				format = { selector : 'time', timePattern : "HH:mm"};
				break;
			default: this.showError("Unknown dateformat: " + this.dateformat);
		}


		return dojo.date.locale.format(date, format);
	},

	getFormattedDateTimeXaxis : function( date ) {

		var formatXaxis = null;
		switch(this.dateformatXaxis) {
			case 'fulldate':
				return date.toLocaleDateString(); /*format = { selector : 'date', datePattern : "y-MM-dd"};*/
			case 'datetime':
				return date.toLocaleDateString() + " " + dojo.date.locale.format(date, { selector : 'time', timePattern : "HH:mm"} ); /*format = { datePattern : "y-MM-dd", timePattern : "HH:mm"};*/
			case 'day':
				formatXaxis = { selector : 'date', datePattern : "EEE d MMM"};
				break;
			case 'month':
				formatXaxis = { selector : 'date', datePattern : "MMM"};
				break;
			case 'monthday':
				formatXaxis = { selector : 'date', datePattern : "dd MMM"};
				break;
			case 'year':
				formatXaxis = { selector : 'date', datePattern : "y"};
				break;
			case 'yearmonth':
				formatXaxis = { selector : 'date', datePattern : "MMM y"};
				break;
			case 'daymonthyeartime':
				format = { selector : 'date', datePattern : "dd MMM y HH:mm"} ;
				break;
			case 'weekyear':
				//formatXaxis = { selector : 'date', datePattern : "w - y"};
				return this.getWeekNr(date) + ' - ' + this.getWeekYear(date);
			case 'time':
				formatXaxis = { selector : 'time', timePattern : "HH:mm"};
				break;
			default: this.showError("Unknown dateformat: " + this.dateformat);
		}


		return dojo.date.locale.format(date, formatXaxis);
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
            if (!this.isdate || this.dateaggregation === "none")
                return x;

            var d = new Date(x);
            if (isNaN(d))
                return x;

            switch (this.dateaggregation) {
                case "year":
                    d.setMonth(0);
                case "month":
                    d.setDate(1);
                case "day":
                    d.setHours(0);
                case "hour":
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    break;
                case "week":
                    var distance = 1 - d.getDay();
                    d.setDate(d.getDate() + distance);
                    d.setHours(0);
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    break;
            }

            return d.getTime();
        },

        //////// SECTION FILTER IMPLEMENTATION
        getActiveConstraint: function(index) {
            if (this.series[index].seriesentity !== this.constraintentity)
                return "";
            var res = "";
            for (var i = 0; i < this.filters.length; i++) {
                var filter = this.filters[i];
                if (filter.value && filter.value !== {} && filter.value !== "") {
                    if (filter.filterattr.indexOf("/") > -1) {
                        for (var key in filter.value)
                            if (filter.value[key] === true) {
                                var attr = filter.filterattr.split("/");
                                res += "[" + filter.filterattr + " = \"" + this.escapeQuotes(key) + "\"]";
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
                                res += "[contains(" + filter.filterattr + ",\"" + this.escapeQuotes(filter.value) + "\")]";
                            break;
                        case "Boolean":
                        case "Enum":
                            var enums = "";
                            var all = true; //if all are checked, include null values
                            for (var key in filter.value) {
                                if (filter.value[key] === true)
                                    enums += "or " + filter.filterattr + "= " + (filter.type === "Enum" ? "\"" + key + "\"" : key) + " ";
                                else
                                    all = false;
                            }
                            if (enums !== "" && !all)
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
                if (input.declaredClass === "dijit.form.CheckBox")
                    input.setValue(true);
                else if (input.nodeName === "SELECT")
                    input.value = "";
                else
                    input.setValue(null);
            }

            this.refresh();
        },

        createrangeNode: function() {
            if (this.constraintentity === "")
                return;

            var open = mxui.dom.create("span", {
                "class": "SimpleChartFilterOpen"
            }, "(filter)");
            this.connect(open, "onclick", function() {
                dojo.style(this.rangeNode, {
                    display: "block"
                });
            });
            dojo.place(open, this.domNode);

            var n = this.rangeNode = mxui.dom.create("div", {
                "class": "SimpleChartRangeNode"
            });
            dojo.place(n, this.domNode);

            //retrieve the type and then construct the inputs

            this.addFilterInputs(mx.meta.getEntity(this.constraintentity));

        },

        inputs: null,

        addFilterInputs: function(meta) {
            try {
                this.inputs = [];

                var close = mxui.dom.create("span", {
                    "class": "SimpleChartFilterClose"
                }, "x");
                this.connect(close, "onclick", this.closeFilterBox);
                dojo.place(close, this.rangeNode);

                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];

                    filter.value = {};
                    var catNode = mxui.dom.create("div", {
                        "class": "SimpleChartFilterCat"
                    });
                    dojo.place(catNode, this.rangeNode);

                    if (filter.filterattr.indexOf("/") > -1) {
                        if (this.usecontext)
                            this.connect(this, "applyContext", dojo.hitch(this, this.addReferencedFilterAttr, filter, catNode)); //wait for context
                        else
                            this.addReferencedFilterAttr(filter, catNode);
                        continue;
                    }

                    dojo.place(mxui.dom.create("span", {
                        "class": "SimpleChartFilterLabel"
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
                    } else if (filter.type === "String") {
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
                    "class": "btn mx-button btn-default SimpleChartFilterUpdate",
                    label: "update",
                    onClick: dojo.hitch(this, function() {
                        this.refresh();
                        this.closeFilterBox();
                    })
                });
                dojo.place(update.domNode, this.rangeNode);
                var clear = new Button({
                    "class": "btn mx-button btn-default SimpleChartFilterClear",
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

            dojo.place(mxui.dom.create("span", {
                "class": "SimpleChartFilterLabel"
            }, filter.filtername), catNode);

            var attrparts = filter.filterattr.split("/");
            var ref = attrparts[0];
            var entity = attrparts[1];
            var attr = attrparts[2];

            var dataconstraint = "";

            for (var i = 0; i < this.series.length; i++)
                if (this.series[i].seriesentity === this.constraintentity)
                    dataconstraint += this.series[i].seriesconstraint; //apply constraint of the data to the selectable items.

            mx.data.get({
                xpath: ("//" + entity + "[" + ref + "/" + this.constraintentity + dataconstraint + "]").replace(/\[\%CurrentObject\%\]/gi, this.dataobject),
                filter: {
                    attributes: [attr],
                    references: {},
                    sort: [
                        [attr, "asc"]
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
                };
            }, this);
            this.createDropdown(catNode, filter, enums);
        },

        closeFilterBox: function() {
            dojo.style(this.rangeNode, {
                display: "none"
            });
        },

        createCheckbox: function(catNode, filter, value, caption) {
            filter.value[value] = true;
            var wrapper = mxui.dom.create("div");
            var checkBox = new CheckBox({
                value: value,
                checked: true
            });
            dojo.place(checkBox.domNode, wrapper);
            dojo.place(mxui.dom.create("label", {
                "class": "SimpleChartFilterCheckboxLabel"
            }, caption), wrapper);
            checkBox.onChange = dojo.hitch(this, function(filter, value, checked) {
                filter.value[value] = checked;
            }, filter, value);
            this.inputs.push(checkBox);
            dojo.place(wrapper, catNode);
        },

        createDropdown: function(catNode, filter, valueArr) {
            var selectNode = mxui.dom.create("select");
            var optionNode = mxui.dom.create("option", {
                value: ""
            }, "");
            selectNode.appendChild(optionNode);
            for (var i = 0; i < valueArr.length; i++)
                if (!filter.value[valueArr[i].key]) { //avoid items to appear twice
                    var optionNode = mxui.dom.create("option", {
                        value: valueArr[i].key
                    }, valueArr[i].caption);
                    filter.value[valueArr[i].key] = false;
                    selectNode.appendChild(optionNode);
                }

            dojo.place(selectNode, catNode);
            this.connect(selectNode, "onchange", dojo.hitch(selectNode, function(filter, e) {
                for (var key in filter.value)
                    filter.value[key] = key === this.value;
            }, filter));
            selectNode.domNode = selectNode;
            this.inputs.push(selectNode);
        },

        createDateRangeSelector: function(catNode, filter) {
            //create two date inputs

            var widget = new DateTextBox({});
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.start = !value ? null : value.getTime();
            }, filter);
            dojo.place(widget.domNode, catNode);
            this.inputs.push(widget);

            widget = new DateTextBox({});
            widget.onChange = dojo.hitch(this, function(filter, value) {
                filter.value.end = !value ? null : value.getTime();
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
            if ((typeof(mxui) !== "undefined") && mxui.html)
                return mxui.html.escapeQuotes(value);
            else
                return mx.parser.escapeQuotesInString(value);
        },

        objectmix: function(base, toadd) {
            //MWE: because console.dir(dojo.mixin({ a: { b: 3 }}, { a: { c: 5 }})); -> { a: { c: 5 }}, but i want to keep b
            if (toadd) {
                /*console.log("in");
                console.dir(base);
                console.log("add");
                console.dir(toadd);*/
                for (var key in toadd) {
                    if ((key in base) &&
                        ((dojo.isArray(toadd[key]) !== dojo.isArray(base[key])) ||
                            (dojo.isObject(toadd[key]) !== dojo.isObject(base[key]))))
                        throw "Cannot mix object properties, property " + key + " has different type in source and destination object";

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
});

require(["SimpleChart/widget/SimpleChart"], function() {
    "use strict";
});
