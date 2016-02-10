/*global Highcharts*/
dojo.require("SimpleChart.widget.lib.highcharts.highcharts_src");
dojo.require("SimpleChart.widget.lib.highcharts.highcharts-more");
dojo.require("SimpleChart.widget.lib.highcharts.highcharts-3d");

define(["dojo/_base/declare"],
    function(declare) {
        "use strict";
        return declare(null, {

            //free up any resources used by the chart
            uninitializeChart: function() {
                if (this.chart) {
                    this.chart.destroy();
                }
            },

            //mapping between the SimpleChart charttype and the HighCharts charttype
            getChartTypeName: function(value) {
                switch (value) {
                    case 'area':
                        return 'area';
                        //case 'areaspline': return 'areaspline';
                    case 'bar':
                        return 'bar';
                    case 'column':
                        return 'column';
                    case 'line':
                        return 'line';
                        //case 'funnel': return 'funnel';
                    case 'pie':
                        return 'pie';
                    case 'scatter':
                        return 'scatter';
                        //case 'gauge': return 'solidgauge';
                    case 'spline':
                        return 'spline';
                        //case 'waterfall': return 'waterfall';
                    case 'stackedLine':
                        return 'area';
                    case 'stackedLBar':
                        return 'area';
                }
                return 'line';
            },

            //triggered if an serie needs to be (re) rendered as a result of receiving (new) data.
            renderSerie: function(index) {
                try {
                    var serie = this.series[index];
                    //first serie, set the categories if names are used
                    if (index === 0 && this.iscategories) {
                        var categories = [];
                        for (var i = 0; i < serie.data.length; i++)
                            categories.push(serie.data[i].labelx);
                        this.chart.xAxis[0].setCategories(categories, false);
                    }

                    var data = this.getSeriesData(index);
                    //if the serie was already created, replace its data
                    if (this.chart.series[index] !== undefined)
                        this.chart.series[index].setData(data.data, false);

                    else //otherwise add a new serie
                        this.chart.addSeries(data, false);

                    this.chart.redraw();

                    if (this.enablePlotbands) {
                        // 20150915 Ivo Sturm - Added plotbands settings
                        if (this.greenColor !== "") {

                            var plotBandOpts = [];

                            var plotBandOpts = [{
                                from: this.objects[0].lowRedBegin,
                                to: this.objects[0].lowRedEnd,
                                color: this.red
                            }, {
                                from: this.objects[0].lowRedEnd,
                                to: this.objects[0].greenBegin,
                                color: this.orange
                            }, {
                                from: this.objects[0].greenBegin,
                                to: this.objects[0].greenEnd,
                                color: this.green
                            }, {
                                from: this.objects[0].greenEnd,
                                to: this.objects[0].highRedBegin,
                                color: this.orange
                            }, {
                                from: this.objects[0].highRedBegin,
                                to: this.objects[0].highRedEnd,
                                color: this.red
                            }];

                            var axisOptions = {
                                plotBands: plotBandOpts
                            };
                            this.chart.yAxis[0].update(axisOptions);

                            //this.chart.yAxis[0].options.plotBands = plotBandOpts;

                        }
                    }
                    this.chart.redraw();
                } catch (e) {
                    this.showError(" Error while rendering serie " + index + ": " + e);
                    console.error(this.id + " Error while rendering serie " + index + ": " + e, e);
                }
            },

            //helper function to constructie a series data array for highcharts
            getSeriesData: function(index) {
                var self = this;
                var size = this.wwidth / this.series.length; //size if multiple pie"s are used
                var serie = this.series[index];

                //add a click event for each point
                for (var j = 0; j < serie.data.length; j++)
                    (function() {
                        var cur = index; //trap the current iteration in the scope
                        var itemindex = j;
                        serie.data[j]["events"] = {
                            click: function(arg1, arg2, arg3) {
                                self.clickCallback(cur, itemindex, this.pageX, this.pageY);
                            }
                        };
                        serie.data[j].x = !self.iscategories && self.uselinearscaling ? serie.data[j].origx : serie.data[j].index;
                    })();

                //set serie properties
                var data = {
                    name: serie.seriesnames,
                    data: serie.data,
                    color: serie.seriescolor,
                    //type: this.getChartTypeName(this.charttype),
                    type: this.getChartTypeName(serie.seriescharttype),
                    showInLegend: this.charttype === "pie" ? false : true,
                    splitseries_enabled: serie.splitseries_enabled,
                    markerradius: serie.markerradius,
                    markersymbol: serie.markersymbol,
                    step: serie.step,
                    dashStyle: serie.dashStyle,
                    //stack: serie.seriesstack,
                };

                if (this.debugging) {
                    console.log(data);
                }

                //make positions for pie
                if (this.series.length > 1 && this.charttype === "pie") {
                    data["center"] = [size * index, Math.round(this.wheight / 2) - 20];
                    data["size"] = Math.round(this.wwidth / this.series.length) - 20;
                }
                return data;
            },

            //create a new chart, set all the default options
            renderChart: function() {
                try {
                    var self = this;
                    var yaxis = [{
                        title: {
                            text: this.yastitle
                        },
                        labels: {
                            formatter: function() {
                                //return self.showyticks ? this.value + " " + self.yunit1 : "";



                                // 2015-08-09 - Wouter van Stralen: formatter aangepast om unit voor of achter de waarde te plaatsen
                                return self.showyticks ? (self.yunit1prefix ? (self.yunit1 + this.value) : this.value + self.yunit1) : "";


                            }
                        },
                        tickLength: this.showyticks ? 5 : 0,
                        min: this.EnableyAxisMin ? this.yAxisMin : "",
                        plotBands: [{}, {}, {}]
                    }];

                    //create seperate y axises
                    for (var i = 1; i < this.series.length; i++) {
                        var serie = this.series[i];
                        if (serie.seriesyaxis !== "true") {
                            if (yaxis.length > 1)
                                continue;
                            else {
                                yaxis[1] = {
                                    title: {
                                        text: this.yastitle2
                                    },
                                    opposite: true,
                                    offset: 0,
                                    tickLength: this.showyticks ? 5 : 0,
                                    labels: {
                                        formatter: function() {
                                            //return self.showyticks ? this.value + " " + self.yunit2 : "";


                                            // 2015-08-09 - Wouter van Stralen: formatter aangepast om unit voor of achter de waarde te plaatsen
                                            return self.showyticks ? (self.yunit1prefix ? (self.yunit2 + this.value) : this.value + self.yunit2) : "";


                                        }
                                    }
                                };
                            }
                        }
                    }

                    var options = {
                        credits: {
                            enabled: false
                        },
                        chart: {
                            renderTo: this.domNode,
                            type: this.charttype !== "other" ? this.charttype : null,
                            zoomType: this.enablezoom ? "x" : null,
                            inverted: this.inverted,
                            width: this.width,
                            height: this.height
                        },
                        title: {
                            text: this.caption
                        },
                        xAxis: {
                            title: {
                                text: this.xastitle
                            },
                            tickLength: this.showxticks ? 5 : 0,
                            tickWidth: this.showxticks ? 2 : 0,
                            labels: {
                                formatter: function() {
                                    if (!self.showxticks)
                                        return "";
                                    return self.getXLabelForValue(this.value);
                                }
                            }
                        },
                        yAxis: yaxis,
                        tooltip: {
                            enabled: this.showhover,
                            shared: this.sharedtooltip,
                            crosshairs: this.showcrosshairs,
                            //formatter: function() {
                            //	return "<b>" + this.series.seriesnames + "</b><br/>" + this.point.labelx + ": " +
                            //		(self.charttype === "pie" ? dojo.number.round(this.percentage, 2) + "%" : this.point.labely);
                            //}



                            // 20151221 Edit Wouter - do not show value in tooltip if isNaN
                            formatter: function() {
                                if (!self.sharedtooltip) {
                                    return '<b>' + this.series.name + '</b><br/>' + this.point.labelx +
                                        (self.charttype == 'pie' ? ': ' + dojo.number.round(this.percentage, 2) + '%' : (isNaN(this.point.labely) ? "" : ': ' + this.point.labely));
                                } else {
                                    var size = this.points.length;
                                    var s = '<b>' + self.getXLabelForValue(this.x) + '</b>';
                                    for (var i = 0; i < size; i++) {
                                        s += '<br/>' + this.points[i].point.series.name + ': ';
                                        s += Highcharts.numberFormat(this.points[i].point.y, 2, '.');
                                    };
                                    return s;
                                }
                            },
                        },







                        plotOptions: {
                            series: {
                                //stacking: this.stacking,
                                //stacking: this.charttype === "stack" ? "normal" : null
                                enabled: this.showhover,
                                pointPadding: parseFloat(this.column_pointpadding),
                                groupPadding: parseFloat(this.column_grouppadding),
                            },
                            line: {},
                            spline: {},
                            area: {},
                            pie: {
                                //colors: colorsArray,
                                dataLabels: {
                                    enabled: true,
                                    formatter: function() {
                                        if (this.percentage > 5)
                                            return this.point.labelx + "<br/>(" + dojo.number.round(this.point.percentage, 0) + "%)";
                                        return "";
                                    },
                                    color: "white"
                                }
                            },
                            column: {
                                borderWidth: this.column_borderwidth,
                                depth: this.column_3ddepth,
                            },
                            bar: {}
                        },
                        legend: {
                            enabled: this.showlegend,
                            borderWidth: this.charttype === "pie" ? 0 : 1
                        }
                    };

                    if (this.extraoptions !== "")
                        this.objectmix(options, dojo.fromJson(this.extraoptions));
                    this.chart = new Highcharts.Chart(options);
                } catch (e) {
                    this.showError("Unable to render the chart, because of error: " + e);
                    console.error("Error while building chart: " + e);
                    if (e.name === "SyntaxError")
                        this.showError("Please check whether the extra chart options are valid JSON");
                }
                return null;
            }
        });
    });
//@ sourceURL=widgets/SimpleChart/widget/highcharts.js
