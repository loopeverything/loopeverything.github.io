// Map SVG dimensions
var width = 960;
var height = 600;

var map; // Map SVG element
var g;
var path = d3.geoPath();
var isZoomed = false; // Is the map zoomed in?

var counties; // County feature collection cache
var states; // State feature collection cache

// Chart variables
// TODO: Wrap these in a Chart class?
var chart; // Chart SVG element
var chartMargin = { top: 10, right: 20, bottom: 30, left: 60 };
var chartWidth = 960 - chartMargin.left - chartMargin.right;
var chartHeight = 500 - chartMargin.top - chartMargin.bottom;
var currentStateID; // State ID being used for the current chart
var xValue;
var xScale;
var xMap;
var xAxis;
var yValue;
var yScale;
var yMap;
var yAxis;

// Array of all attributes in the economic data 
// -> we could scan to dynamically load this, but cheaper to just set it manually
var attributes = ["county", "units", "value", "income", "costs", "taxes"];
var selectedAttribute = "units"; // Default selected attribute
var colorDomain; // Cache values for the currently selected attribute for the color scale's domain

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
    // Append the map SVG
    map = d3.select(".map-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add a rect to the map; seems to be needed for zooming
    map.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);

    g = map.append("g");

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

        // Cache the county and state feature collections
        counties = topojson.feature(mapData, mapData.objects.counties);
        states = topojson.feature(mapData, mapData.objects.states);
        
        g.selectAll(".county")
            .data(counties.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", function(d) {
                return getColor(econData[selectedAttribute].get(d.id));
            })
            .attr("class", function(d) {
                return "county county-" + d.id;
            })
            .on("mouseover", highlight)
            .on("mouseout", unhighlight)
            .on("mousemove", moveLabel)
            .on("click", countyClicked);

        g.selectAll(".state")
            .data(states.features)
            .enter().append("path")
            .attr("d", path)
            .attr("class", function(d) {
                return "state state-" + d.id;
            });

        $(".loading").toggle(false);
    }
}

// Handle count onclick event
function countyClicked(d)
{
    // Get the state ID
    var state = d.id.substring(0, 2);

    // Create a chart for the county's parent state
    createChart(state);

    // Zoom to the county's parent state
    zoomTo(state);
}

// Create the zoom behavior
var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

// Handle the zoom event
function zoomed() {
    g.style("stroke-width", 1.4 / d3.event.transform.k + "px");
    g.attr("transform", d3.event.transform);
}

//https://bl.ocks.org/iamkevinv/0a24e9126cd2fa6b283c6f2d774b69a2
function zoomTo(id)
{
    // Is the map already zoomed in? If so, reset it
    if (isZoomed)
    {
        resetZoom();

    // Zoom in to the state ID that was passed
    } else {
        // Find the state GeoJSON object that matches the passed ID
        var d = states.features.find(function (d) {
            return d.id == id;
        });

        // Get bounds information for the state feature
        var bounds = path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
            translate = [width / 2 - scale * x, height / 2 - scale * y];

        // Execute the zoom transition
        map.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

        // Map is zoomed in
        isZoomed = true;
    }
}

function resetZoom()
{
    // Execute the zoom transition
    map.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);

    // Map is no longer zoomed in
    isZoomed = false;
}

// Handle county onmouseover event
function highlight(d) 
{ 
    createLabel(d.id);

    // If chart exists -> Highlight bar associated wtih the county
    if (chart) {
        chart.selectAll(".bar-" + d.id)
            .style("stroke", "#ff0000")
            .style("stroke-width", "2px");
    }
}

// Handle county onmouseout event
function unhighlight(d) 
{ 
    destroyLabel();

    // If chart exists -> Unhighlight bar associated with the county
    if (chart) {
        chart.selectAll(".bar-" + d.id)
            .style("stroke", "#fff")
            .style("stroke-width", "0.5px");
    }
}

// Handle chart bar onmouseover event
function highlightBar(id) 
{ 
    // Create the info label
    createLabel(id, false);

    // Highlight the associated county
    map.selectAll(".county-" + id)
        .style("stroke", "#ff0000")
        .style("stroke-width", "1.5px");
}

// Handle chart bar onmouseover event
function unhighlightBar(id) 
{ 
    // Destroy the info label
    destroyLabel(); 

    // Unhighlight the associated county
    map.selectAll(".county-" + id)
        .style("stroke", "#fff")
        .style("stroke-width", "0.4px");
}

// Create the county label
function createLabel(id, countyHighlight = true)
{
    // FIXME: Need a check for No Data

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
            if (value != "No Data")
                value = "$" + value;
            break;
        case "income":
            subtitle = "Median Household Income";
            if (value != "No Data")
                value = "$" + value;
            break;
        case "costs":
            subtitle = "Median Monthly Housing Costs";
            if (value != "No Data")
                value = "$" + value;
            break;
        case "taxes":
            subtitle = "Median Real Estate Taxes";
            if (value != "No Data")
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
function destroyLabel() { d3.select(".county-label").remove(); }

// User moved mouse -> move label position
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
    var colors = ["#ffffe8", "#fffee1", "#fefed2", "#eaf3c9", "#d8e9c1", "#b7d5b6", "#93bca9", "#80ada2", "#527e89", "#283147"];

    if (!colorDomain)
        updateColorDomain();

    var colorScale = d3.scaleQuantile()
        .range(colors)
        .domain(colorDomain);

    /*
    // TODO: Dynamically scale the colors rather than manually defining them
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
        return '#eee';
    };
}
// Create chart for state ID
// https://bl.ocks.org/mbostock/5977197
function createChart(stateID) {
    // Save the state ID incase user changes the selected attribute
    currentStateID = stateID;

    if (chart)
        d3.select(".chart").remove();

    // For the chart title, let's cheat and strip the state name from the county name data we already have
    var countyName = econData["county"].get(stateCounties[stateID][0]);
    var stateName = countyName.split(", ")[1];

    // Chart title
    $(".chart-title").css("display", "inherit");

    var subtitle;
    switch (selectedAttribute) {
        case "units":
            subtitle = "Number of Owner-Occupied Units";
            break;
        case "value":
            subtitle = "Median Home Value";
            break;
        case "income":
            subtitle = "Median Household Income";
            break;
        case "costs":
            subtitle = "Median Monthly Housing Costs";
            break;
        case "taxes":
            subtitle = "Median Real Estate Taxes";
            break;
        default:
            break;
    }

    $(".chart-title").text(subtitle + " in " + stateName);

    // X-axis scale and values
    xValue = function (d) { return d; };
    xScale = d3.scaleOrdinal().range([0, chartWidth], .1);
    xMap = function (d) { return xScale(xValue(d)); };
    xAxis = d3.axisBottom(xScale);

    // Y-axis scale and values
    yValue = function (d) {
        var value = parseFloat(econData[selectedAttribute].get(d));
        if (typeof value == 'number' && !isNaN(value))
            return value;
        else
            return 0;
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
    for (var key in stateCounties[stateID]) {
        if (parseFloat(econData[selectedAttribute].get(stateCounties[stateID][key])) > maxValue)
            maxValue = econData[selectedAttribute].get(stateCounties[stateID][key]);
    }

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
        .data(stateCounties[stateID])
        .enter().append("rect")
        .attr("class", function (d) {
            return "bar bar-" + d;
        })
        .attr("fill", function (d) {
            return getColor(econData[selectedAttribute].get(d));
        })
        .sort(function (a, b) {
            //return econData[selectedAttribute].get(b) - econData[selectedAttribute].get(a);
            return yMap(a) - yMap(b);
        })
        .attr("x", function (d, i) {
            return i * (chartWidth / stateCounties[stateID].length) + 5;
        })
        .attr("width", chartWidth / stateCounties[stateID].length - 1)
        .attr("y", yMap)
        .attr("height", function (d, i) {
            return chartHeight - yMap(d);
        })
        .on("mouseover", highlightBar)
        .on("mouseout", unhighlightBar)
        .on("mousemove", moveLabel);
}

// Handle attribute-select onchange event
function changedAttribute() {
    // Show the Loading message and then wait for it to finish easing before starting transition
    $(".loading").toggle(500, function () {
        // Update the selected attribute
        selectedAttribute = $("#attribute-select").val();

        // Update domain used for the color scale
        updateColorDomain();

        // If chart exists -> remake it
        if (chart) {
            // Check shouldn't be needed, but be safe
            if (currentStateID)
                createChart(currentStateID);
        }

        // Transition county fills
        map.selectAll(".county")
            .transition()
            .delay(function (d, i) { return i * 1; })
            .duration(600)
            .attr("fill", function (d) {
                return getColor(econData[selectedAttribute].get(d.id));
            })
            .on("end", function () {
                $(".loading").toggle(false);
            });
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