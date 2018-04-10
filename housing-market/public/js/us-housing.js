// Map SVG dimensions
// var margin = { top: 20, right: 10, bottom: 20, left: 10 };
// var width = 960 - margin.left - margin.right;
// var height = 500 - margin.top - margin.bottom;
var width = 960;
var height = 600;

var map; // Map SVG element
var path = d3.geoPath();
var counties; // County feature collection cache
var states; // State feature collection cache

// Chart variables
// TODO: Wrap these in a Chart class?
var chart; // Chart SVG element
var chartMargin = { top: 20, right: 20, bottom: 30, left: 60 };
var chartWidth = 960 - chartMargin.left - chartMargin.right;
var chartHeight = 500 - chartMargin.top - chartMargin.bottom;
var xValue;
var xScale;
var xMap;
var xAxis;
var yValue;
var yScale;
var yMap;
var yAxis;

//var quantile = d3.scaleQuantile()
//    .range(d3.range(9).map(function (i) { return "q" + i + "-9"; }));
var colorDomain; // Cache values for the currently selected attribute for the color scale's domain

// Array of all attributes in the economic data 
// -> we could scan to dynamically load this, but cheaper to just set it manually
var attributes = ["county", "units", "value", "income", "costs", "taxes"];
var selectedAttribute = "units"; // Default selected attribute

// Cache for the economic data
var econData = [];
attributes.forEach(function (attribute) {
    econData[attribute] = d3.map();
});

// Cache object for saving county-state association
var stateCounties = {};

// Set up the map SVG space, queue data, and then load it when it's ready
function makeMap()
{
    map = d3.select(".map-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // map = d3.select(".map-container").append("svg")
    //     .attr("width", width + margin.left + margin.right)
    //     .attr("height", height + margin.top + margin.bottom)
    //     .append("g")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.queue()
        .defer(d3.csv, "/housing-market/data/us_economic.csv", function (d) {
            // Loop through the attributes and cache the data for each
            attributes.forEach(function (attribute) {
                econData[attribute].set(d.id, d[attribute]);
            });

            // Get the state ID for this county
            var stateID = d.id.substring(0, 2); // Get the state ID

            // If the array hasn't been created -> create it
            if (!stateCounties[stateID])
                stateCounties[stateID] = new Array();

            // Push the county ID to the state
            stateCounties[stateID].push(d.id);
        })
        .defer(d3.json, "https://d3js.org/us-10m.v1.json")
        .await(ready);

    function ready(error, economic, mapData) {
        if (error) throw error;

        console.log("Starting");

        // Cache the county and state feature collections
        counties = topojson.feature(mapData, mapData.objects.counties);
        states = topojson.feature(mapData, mapData.objects.states);

        // console.log(counties);
        // console.log(d3.keys(counties));
        // console.log(d3.entries(counties));
        
        map.selectAll(".county")
            .data(counties.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", function(d) {
                // FIXME: Very slow -> cache the domain when the select-attribute changes so it isn't done for every county
                // FIXME: Better, but still slow

                //return getColor(econData[selectedAttribute].values(), econData[selectedAttribute].get(d.id));
                return getColor(econData[selectedAttribute].get(d.id));
            })
            .attr("class", function(d) {
                return "county county-" + d.id;
            })
            .on("mouseover", highlight)
            .on("mouseout", unhighlight)
            .on("mousemove", moveLabel)
            .on("click", countyClicked);

        map.selectAll(".state")
            .data(states.features)
            .enter().append("path")
            .attr("d", path)
            .attr("class", function(d) {
                return "state state-" + d.id;
            });

        console.log("Done");
    }
}

// Handle attribute-select onchange event
function changedAttribute()
{
    console.log("Changed attribute");

    selectedAttribute = $("#attribute-select").val();

    updateColorDomain();

    map.selectAll(".county")
        .transition()
        .delay(function (d, i) { return i * 1; })
        .duration(600)
        .attr("fill", function (d) {
            return getColor(econData[selectedAttribute].get(d.id));
        });

    // TODO: Show a loading message/image to the user here since it can take a couple of seconds to refresh
}

// Handle count onclick event
function countyClicked(d)
{
    // Get the state ID
    var state = d.id.substring(0, 2);

    // if (!chart)
    //     createChart(state);
    // else
    //     updateChart(state);

    // FIXME: Fix the updateChart method so there are smooth transitions
    createChart(state);
}

// Handle county onmouseover event
function highlight(d) 
{
    createLabel(d.id);
}

// Handle county onmouseout event
function unhighlight(d)
{
    destroyLabel();
}

function highlightBar(id)
{
    createLabel(id, false);
}

function unhighlightBar(id)
{
    destroyLabel();
}

// Create the county label
function createLabel(id, countyHighlight = true)
{
    // Make sure there is data to display
    var value = parseFloat(econData[selectedAttribute].get(id));
    if (typeof value == 'number' && !isNaN(value))
        value = value.toLocaleString('en');
    else
        value = "No Data";

    var subtitle;
    switch (selectedAttribute) {
        case "units":
            subtitle = "Number of Owner-Occupied Units";
            break;
        case "value":
            subtitle = "Median Home Value";
            value = "$" + value;
            break;
        case "income":
            subtitle = "Median Household Income";
            value = "$" + value;
            break;
        case "costs":
            subtitle = "Median Monthly Housing Costs";
            value = "$" + value;
            break;
        case "taxes":
            subtitle = "Median Real Estate Taxes";
            value = "$" + value;
            break;
        default:
            break;
    }

    var content = "<p class='title'>" + econData["county"].get(id) + "</p>";
    content += "<p class='subtitle'>" + subtitle + "</p>";
    content += "<p class='body'>" + value + "</p>";

    if (countyHighlight)
        content += "<p class='more-info'>Click for state information</p>";

    var label = d3.select("body")
        .append("div")
        .attr("class", "county-label")
        .html(content)
}

// Destroy the county label
function destroyLabel()
{
    d3.select(".county-label").remove();
}

// User moved mouse -> move label position
// FIXME: Little laggy, is this just D3?
function moveLabel(d) 
{
    var x = d3.event.pageX + 10;
    var y = d3.event.pageY;

    d3.select(".county-label")
        .style("left", x + "px")
        .style("top", y + "px");
}

// Cache the values for the currently selected attribute
function updateColorDomain()
{
    colorDomain = econData[selectedAttribute].values();
}

// Get a color based on a quantile scale from the COLORS range
function getColor(value) 
{
    var colors = [
        "#ffffe8",
        "#fffee1",
        "#fefed2",
        "#eaf3c9",
        "#d8e9c1",
        "#b7d5b6",
        "#93bca9",
        "#80ada2",
        "#527e89",
        "#283147"
    ];

    if (!colorDomain)
        updateColorDomain();

    var colorScale = d3.scaleQuantile()
        .range(colors)
        .domain(colorDomain);

    /*
    // FIXME: Dynamically scale the colors
    var colorScale = d3.scaleQuantile()
        // .range(d3.interpolateHcl(d3.hcl("hsl(62, 100%, 90%)"), d3.hcl("hsl(228, 30%, 20%)")))
        // .range(d3.range(9).map(function(i) {
        //     return d3.interpolate(d3.hcl("hsl(62, 100%, 90%)"), d3.hcl("hsl(228, 30%, 20%)"))(i);
        // }))
        .domain(colorDomain);
    */

    // Check for invalid value -> make sure a number is passed
    value = parseFloat(value);
    if (typeof value == 'number' && !isNaN(value)) {
        return colorScale(value);
    } else {
        return '#333333';
    };
}
// Create chart for state ID
// https://bl.ocks.org/mbostock/5977197
function createChart(state) {
    if (chart)
        d3.select(".chart").remove();

    // console.log(stateCounties[state]);

    // stateCounties[state].foreach(function(d) {
    //     console.log("d: " + d + " val: " + econData[selectedAttribute].get(d));
    // });

    // for (var key in stateCounties[state])
    // {
    //     console.log(key, stateCounties[state][key]);
    //     console.log(econData[selectedAttribute].get(stateCounties[state][key]));
    // }

    // _stateCounties = Array.from(stateCounties[state]);
    // return;

    // X-axis scale and values
    xValue = function (d) { return d; };
    xScale = d3.scaleOrdinal().range([0, chartWidth], .1);
    xMap = function (d) { return xScale(xValue(d)); };
    xAxis = d3.axisBottom(xScale);

    // Y-axis scale and values
    yValue = function (d) { 
        // return d;
        // console.log("Val: " + econData[selectedAttribute].get(d));
        
        return econData[selectedAttribute].get(d);
    };
    yScale = d3.scaleLinear().range([chartHeight, 0]);
    yMap = function (d) { return yScale(yValue(d)); };
    yAxis = d3.axisLeft(yScale);

    // Create the chart SVG
    chart = d3.select(".chart-container").append("svg")
        .attr("class", "chart")
        .attr("width", chartWidth + chartMargin.left + chartMargin.right)
        .attr("height", chartHeight + chartMargin.top + chartMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + chartMargin.left + "," + chartMargin.top + ")");

    // Get max value for domain
    var maxValue = 0;
    for (var key in stateCounties[state]) {
        if (parseFloat(econData[selectedAttribute].get(stateCounties[state][key])) > maxValue)
            maxValue = econData[selectedAttribute].get(stateCounties[state][key]);
    }
    // maxValue += (maxValue * 0.001);
    console.log("Max: " + maxValue);
    
    // Update the domain for the y-scale values
    yScale.domain([0, maxValue]);

    // Add the y-axis
    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Value");

    // Add the bars
    chart.selectAll(".bar")
        .data(stateCounties[state])
        .enter().append("rect")
        .attr("class", "bar")
        .attr("fill", function (d) {
            return getColor(econData[selectedAttribute].get(d));
        })
        .sort(function (a, b) {
            return econData[selectedAttribute].get(b) - econData[selectedAttribute].get(a);
        })
        .attr("x", function (d, i) {
            return i * (chartWidth / stateCounties[state].length) + 5;
        })
        .attr("width", chartWidth / stateCounties[state].length - 1)
        .attr("y", yMap)
        .attr("height", function (d, i) {
            return chartHeight - yMap(d);
        })
        .on("mouseover", highlightBar)
        .on("mouseout", unhighlightBar)
        .on("mousemove", moveLabel);
        // .on("mouseover", function(d) {
        //     return highlight(d);
        // })
        // .on("mouseout", function(d) {
        //     return unhighlight(d);
        // })
        // .on("mousemove", function(d) {
        //     return moveLabel(d);
        // });
}

// FIXME: Chart items should dynamically be updated, so a smooth transition can be shown
// FIXME: Trying it now just transitions X number of columns from previous state
function updateChart(state) {
    var data = [];
    econData[selectedAttribute].each(function (val, key) {
        var thisState = key.substring(0, 2);

        if (thisState == state) {
            data.push(val);
            //data[key] = val;
        }
    });

    // Update the domain for the y-scale
    yScale.domain([0, d3.max(data, yValue)]);

    console.log(data);

    chart.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Value");

    chart.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .sort(function (a, b) {
            return b - a;
        })
        .attr("x", function (d, i) {
            return i * (chartWidth / data.length) + 0;
        })
        .attr("width", chartWidth / data.length - 1)
        .attr("y", yMap)
        .attr("height", function (d) {
            console.log("d2: " + yMap(d));

            return chartHeight - yMap(d);
        });
}

// Ready
$(function() 
{
    makeMap();

    // Set up attribute-select
    $("#compute_option").html($('#attribute-select option:selected').text());
    $("#attribute-select").width($("#compute_select").width());

    $("#attribute-select").change(function () {
        changedAttribute();

        // Resize select
        $("#compute_option").html($('#attribute-select option:selected').text());
        $(this).width($("#compute_select").width());

        $(this).blur();
    });
});