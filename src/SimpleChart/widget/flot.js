/*global jQuery*/
require({
    packages: [
        { name: 'jquery', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery' },
        { name: 'jqueryflot', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery.flot' },
        { name: 'jquerypie', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery.flot.pie' },
        { name: 'jqueryselection', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery.flot.selection' },
        { name: 'jquerystack', location: '../../widgets/SimpleChart/widget/lib/flot', main: 'jquery.flot.stack' }
    ]
},[
  "dojo/_base/declare",
  "SimpleChart/widget/lib/flot/excanvas",
  "jquery",
  "jqueryflot",
  "jquerypie",
  "jqueryselection",
  "jquerystack"

], function(declare, excanvas, jquery) {
    "use strict";
    console.dir(jquery);
    var $ = jquery.noConflict(true);

// define([
//     "dojo/_base/declare",
//     "SimpleChart/widget/lib/flot/excanvas",
//     // "SimpleChart/widget/lib/flot/jquery.flot",
//     // "SimpleChart/widget/lib/flot/jquery.flot.pie",
//     // "SimpleChart/widget/lib/flot/jquery.flot.selection",
//     // "SimpleChart/widget/lib/flot/jquery.flot.stack",
// ],
// function(declare) {
//     "use strict";
    return declare(null, {

        uninitializeChart: function() {
            //TODO:
            //this.chart && this.chart.destroy();
        },

        receivedseries: null,

        //triggered if an serie needs to be (re) rendered as a result of receiving (new) data.
        renderSerie: function(index) {
            if (!this.receivedseries)
                this.receivedseries = [];
            this.receivedseries[index] = true;

            //if all series received:
            var all = true;
            for (var i = 0; i < this.series.length; i++)
                all = all && (this.receivedseries[i] === true);

            if (all) {
                this.uninitializeChart(); //destroy current serie
                this.drawChart(); //create a new chart
            }
        },

        drawChart: function() {
            try {
                var self = this;

                //options
                var options = {
                    title: this.caption,
                    grid: {
                        borderColor: null,
                        borderWidth: 0,
                        hoverable: true,
                        clickable: true,
                        labelMargin: 20
                    },
                    xaxis: {
                        show: true,
                        ticks: this.showxticks ? (this.iscategories ? null : this.wwidth / 100) : 0,
                        tickFormatter: function(tick, axis) {
                            if (self.iscategories) {
                                if (tick >= 0 && tick < self.categoriesArray.length) {
                                    return self.categoriesArray[tick];
                                }
                            }

                            if (self.charttype === "bar" || self.charttype === "stackedbar") {
                                for (var i = 0; i < self.series.length; i++) {
                                    if (tick < self.series[i].data.length && self.series[i].data[tick])
                                        return self.series[i].data[tick].labelx;
                                }
                                return "";
                            } else
                                return self.getXLabelForValue(tick);
                        }
                    },
                    yaxis: {
                        ticks: this.showyticks ? null : 0,
                        tickFormatter: function(val, axis) {
                            return dojo.number.round(val, 2) + " " + self.yunit1;
                        }
                    },
                    legend: {
                        show: this.charttype !== "pie" && this.showlegend
                    }
                };

                if (this.isdate) {
                    //options.xaxis.mode = "time";
                    var mintick = null;
                    switch (this.dateformat) {
                        case "time":
                            mintick = "hour";
                            break;
                        case "day":
                        case "datetime":
                        case "monthday":
                            mintick = "day";
                            break;
                        case "fulldate":
                        case "week":
                        case "weekyear":
                        case "month":
                        case "yearmonth":
                            mintick = "month";
                            break;
                        case "year":
                            mintick = "year";
                            break;
                        default:
                            this.showError("Unknown dateformat: " + this.dateformat);
                    }
                    if (this.isLocalizedDate)
                        options.xaxis.timezone = "browser";
                    else
                        options.xaxis.timezone = null;

                    options.xaxis.minTickSize = [1, mintick];
                }
                //set ticksize to one for category based items
                else if (this.iscategories)
                    options.xaxis.tickSize = 1;

                if (this.enablezoom)
                    this.showWarning("SimpleChart: Flot implementation does not support zooming.");
                /*		TODO: something like this		options.selection = { mode : "x" };
                				jQuery(this.flotNode).bind("plotselected", dojo.hitch(this, function (event, options, ranges) {
                				// do the zooming
                					options.xaxis.min = ranges.xaxis.from;
                					options.xaxis.max = ranges.xaxis.to;
                					this.chart = jQuery.plot(this.flotNode, this.getSeriesData(), options);
                				}, options));
                */

                //create seperate y axises
                for (var i = 1; i < this.series.length; i++) {
                    var serie = this.series[i];
                    if (serie.seriesyaxis !== true) {
                        dojo.mixin(options, {
                            y2axis: {
                                label: this.yastitle2,
                                show: true,
                                alignTicksWithAxis: 1,
                                ticks: this.showyticks ? null : 0,
                                tickFormatter: function(val, axis) {
                                    return dojo.number.round(val, 2) + " " + self.yunit2;
                                }
                            }
                        });
                        break;
                    }
                }

                if (this.charttype === "pie") {
                    dojo.mixin(options, {
                        series: {
                            pie: {
                                show: true,
                                radius: 3 / 4,
                                label: {
                                    show: true,
                                    radius: 3 / 4,
                                    formatter: function(label, series) {
                                        return "<div class = \"SimpleChartFlotPieLabel\">" + label + "<br/>" + Math.round(series.percent) + "%</div>";
                                    },
                                    background: {
                                        opacity: 0.5,
                                        color: "#000"
                                    },
                                    treshold: 0.1
                                },
                                highlight: {
                                    opacity: 0.5
                                }
                            }
                        }
                    });
                }

                if (this.extraoptions !== "")
                    this.objectmix(options, dojo.fromJson(this.extraoptions));

                this.chart = jQuery.plot(this.flotNode, this.getSeriesData(), options);

                jQuery(this.flotNode).bind("plotclick", function(event, pos, item) {
                    if (item) {
                        if (self.charttype === "pie")
                            self.clickCallback(0, item.seriesIndex, item.pageX, item.pageY); //the serieindex is the item index for pies
                        else
                            self.clickCallback(item.seriesIndex, item.dataIndex, item.pageX, item.pageY);
                    }
                });
                if (this.showhover)
                    jQuery(this.flotNode).bind("plothover", function(event, pos, item) {
                        if (!dojo.isIE && item && self.charttype !== "pie") { //showToolTip does not work in IE so...
                            if (self.previousPoint !== item.datapoint) {
                                self.previousPoint = item.datapoint;

                                jQuery("#tooltip").remove();
                                var data = self.series[item.seriesIndex].data[item.dataIndex];
                                self.showTooltip(item.pageX, item.pageY, (item.series.label !== null ? item.series.label + "<br/>" : "") +
                                    (data.labelx !== null ? data.labelx + ": " : "") + data.labely + (self.charttype === "stackedbar" || self.charttype === "stackedline" ? " (subtotal)" : ""));
                            }
                        } else {
                            jQuery("#tooltip").remove();
                            self.previousPoint = null;
                        }
                    });

            } catch (e) {
                console.error("Error while drawing chart: " + e);
                if (e.name === "SyntaxError")
                    this.showError("Please check whether the extra chart options are valid JSON");
            }
            return null;
        },

        drawLabels: function() {
            //extend the draw method to draw axis labels
            if (this.caption !== "")
                this.drawLabel("SimpleChartCaption", this.wwidth / 2, -20, this.caption, {
                    fontSize: "large"
                }, "h");

            if (this.charttype === "pie") //skip other labels if pie
                return;

            if (this.xastitle !== "")
                this.drawLabel("SimpleChartXAxis", this.wwidth / 2, this.wheight + 12, this.xastitle, {
                    fontWeight: "bold",
                    fontStyle: "italic"
                }, "h");
            if (this.yastitle !== "")
                this.drawLabel("SimpleChartYAxis", 0, -16, this.yastitle, {
                    fontStyle: "italic"
                });
            if (this.yastitle2 !== "")
                this.drawLabel("SimpleChartYAxis2", this.wwidth, -16, this.yastitle2, {
                    fontStyle: "italic"
                }, "r");
        },

        drawLabel: function(clazz, x, y, text, style, center) {
            var span = mxui.dom.span({
                "class": "tickLabel SimpleChartFlotTickLabel " + clazz
            }, text);
            dojo.style(span, dojo.mixin({
                position: "absolute",
                top: y,
                left: x
            }, !style ? {} : style));

            dojo.place(span, this.domNode);
            if (center === "h")
                dojo.style(span, "left", x - dojo.style(span, "width") / 2);
            if (center === "r")
                dojo.style(span, "left", x - dojo.style(span, "width"));
        },


        //helper function to constructie a series data array for flot
        getSeriesData: function() {
            var self = this;
            var res = [];

            if (this.charttype === "pie" && this.series.length > 1)
                this.showError("SimpleChart Flot implementation does not support multiple series in pie charts.");

            for (var i = 0; i < this.series.length; i++) {
                var serie = this.series[i];
                //set serie properties
                var seriedata = [];
                for (var j = 0; j < serie.data.length; j++) {
                    var y = serie.data[j].y;
                    if (this.charttype === "pie") //pie"s data is structered in another way
                        seriedata.push({
                        label: serie.data[j].labelx,
                        data: y
                    });
                    else if (this.charttype === "bar") //give bars a small offset
                        seriedata.push([serie.data[j].index + i / (this.series.length + 1), y]);
                    else if (this.charttype === "stackedbar")
                        seriedata.push([serie.data[j].index, y]);
                    else
                        seriedata.push([serie.data[j].origx, y]);
                }

                if (this.charttype === "pie")
                    return seriedata; //for pie charts, the pie data is the data to plot. see: http://flot.googlecode.com/svn/trunk/examples/pie.html

                var data = {
                    label: serie.seriesnames,
                    data: seriedata,
                    yaxis: serie.seriesyaxis === true ? 1 : 2
                };
                if (serie.seriescolor !== "")
                    data.color = serie.seriescolor;

                switch (this.charttype) {
                    case "pie":
                        data.pie = {
                            show: true,
                            autoScale: true,
                            fillOpacity: 1
                        };
                        break;
                    case "bar":
                        data.bars = {
                            show: true,
                            barWidth: 1 / (this.series.length + 2)
                        };
                        if (this.inverted)
                            data.bars.horizontal = true;
                        break;
                    case "line":
                        data.lines = {
                            show: true
                        };
                        if (serie.seriesshowpoint === true)
                            data.points = {
                                show: true
                            };
                        else
                            data.points = {
                                show: false
                            };

                        break;
                    case "curve":
                        this.showWarning("SimpleChart Flot implementation does not support type 'curve'. Falling back to 'line'.");
                        data.lines = {
                            show: true
                        };
                        break;
                    case "stackedline":
                        data.lines = {
                            show: true,
                            fill: true
                        };
                        data.stack = true;
                        if (serie.seriesshowpoint === true)
                            data.points = {
                                show: true
                            };
                        else
                            data.points = {
                                show: false
                            };
                        break;

                    case "stackedbar":
                        data.bars = {
                            show: true,
                            barWidth: 0.8
                        };
                        data.stack = true;
                        break;
                }

                res.push(data);
            }
            return res;
        },

        //create a new chart, set all the default options
        renderChart: function() {
            if (this.inverted)
                this.showWarning("SimpleChart Flot implementation does not support inverted axis.");

            this.flotNode = mxui.dom.div({
                "class": "SimpleChartFlotWrapperNode"
            });
            dojo.addClass(this.domNode, "SimpleChartFlotContainer");
            var chartHeight = this.wheight - 50; //substract the height for the padding and the x labels
            chartHeight -= (this.caption !== "" ? 20 : 0); //Substract the height for the graph caption

            dojo.style(this.flotNode, {
                width: (this.wwidth - 20) + "px",
                height: chartHeight + "px"
            });
            dojo.place(this.flotNode, this.domNode);
            this.drawLabels();
            // dojo.html.set(this.flotNode, "Loading chart..");
            return null;
        },

        showTooltip: function(x, y, contents) {
            jQuery("<div id=\"tooltip\" class=\"SimpleChartFlotTooltip\">" + contents + "</div>").css({
                "top": y + 5,
                "left": x + 5
            }).appendTo("body").fadeIn(200);
        }

    });
});
