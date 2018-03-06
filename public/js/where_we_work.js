var map;
var legend;
var industry;
var year;
var currentFeature;

var totalsLayer;
var industryLayer;

// Charts
var industryChart;
var industryChartCanvas;
var totalsChart;
var totalsChartCanvas;

// Global default point style
var defaultStyle = {
  radius: 8,
  fillColor: "#0000ff",
  color: "#fff",
  weight: 1,
  opacity: 0.5,
  fillOpacity: 0.75
};

// Set the map bounds to the US
var usBounds = [
  [16.348173, -162.970808], // Southwest
  [66.502291, -46.015072] // Northeast
];

function createMap()
{
  // Set default industry and year
  industry = "EST_VC04";
  year = "2016";

  // Create the map
  map = L.map('map', {
    maxBounds: usBounds,
    maxBoundsViscosity: 0.15,
    doubleClickZoom: false
  }).setView([37.8, -96], 4);

  // Set the basemap
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    minZoom: 4,
    maxZoom: 6,
    id: 'mapbox.light',
    accessToken: 'pk.eyJ1IjoiYXRobXBzbiIsImEiOiJjajZ5bWVjOHgwNGp4MnhzZzMxa2pkeDBiIn0.MIHVmqU0AzpJTACceAr4Zg'
  }).addTo(map);

  // Create symbols for employment totals
  totalsLayer = createPropSymbols(mapData, "EST_VC01|" + year);

  // Create symbols for the industry figures
  industryLayer = createPropSymbols(mapData, industry + "|" + year);
}

function getRadius(value, property)
{
  if (property == "EST_VC01")
    var scaleFactor = 0.0012;
  else
    var scaleFactor = 0.0012;

  var area = value * scaleFactor;

  // Radius calculated based on area
  var radius = Math.sqrt(area/Math.PI);

  return radius;
}

function getColor(industry, hex = true, opacity = 1)
{
  if (hex)
  {
    switch (industry)
    {
      case "EST_VC02":
        return "#8dd3c7";
        break;
      case "EST_VC03":
        return "#ffffb3";
        break;
      case "EST_VC04":
        return "#bebada";
        break;
      case "EST_VC05":
        return "#fb8072";
        break;
      case "EST_VC06":
        return "#80b1d3";
        break;
      case "EST_VC07":
        return "#fdb462";
        break;
      case "EST_VC08":
        return "#b3de69";
        break;
      case "EST_VC09":
        return "#fccde5";
        break;
      case "EST_VC10":
        return "#bf6262";
        break;
      case "EST_VC11":
        return "#bc80bd";
        break;
      case "EST_VC12":
        return "#ccebc5";
        break;
      case "EST_VC13":
        return "#acf0f2";
        break;
      case "EST_VC14":
        return "#ffed6f";
        break;
      default:
        return "#485158";
        break;
    }
  } else {
    switch (industry)
    {
      case "EST_VC02":
        return "rgba(141, 211, 199, " + opacity + ")";
        break;
      case "EST_VC03":
        return "rgba(255, 255, 179, " + opacity + ")";
        break;
      case "EST_VC04":
        return "rgba(190, 186, 218, " + opacity + ")";
        break;
      case "EST_VC05":
        return "rgba(251, 128, 114, " + opacity + ")";
        break;
      case "EST_VC06":
        return "rgba(128, 177, 211, " + opacity + ")";
        break;
      case "EST_VC07":
        return "rgba(253, 180, 98, " + opacity + ")";
        break;
      case "EST_VC08":
        return "rgba(179, 222, 105, " + opacity + ")";
        break;
      case "EST_VC09":
        return "rgba(252, 205, 229, " + opacity + ")";
        break;
      case "EST_VC10":
        return "rgba(191, 98, 98, " + opacity + ")";
        break;
      case "EST_VC11":
        return "rgba(188, 128, 189, " + opacity + ")";
        break;
      case "EST_VC12":
        return "rgba(204, 235, 197, " + opacity + ")";
        break;
      case "EST_VC13":
        return "rgba(172, 240, 242, " + opacity + ")";
        break;
      case "EST_VC14":
        return "rgba(255, 237, 111, " + opacity + ")";
        break;
      default:
        return "rgba(72, 81, 88, " + opacity + ")";
        break;
    }
  }
}

// Bind the onClick method to our features
function onEachFeature(feature, layer)
{
  layer.on("click", function(e) {
    onClick(feature);
  });
}

// Load supplemental charts
function onClick(feature)
{
  // Save the current feature
  currentFeature = feature;

  // Update legend
  createOrUpdateLegend();

  createOrUpdateCharts(feature);

  $("#industry-chart-section").show();
  $("#totals-chart-section").show();

  $('html, body').animate({
    scrollTop: $("#industry-chart-section").offset().top - 20
  }, 1000);
}

function createOrUpdateCharts(feature)
{
  // Set industry title
  var industryTitle = $("#industry-select option:selected").text() + " in " + feature.properties.title;
  $("#industry-chart-title").html(industryTitle);

  // Create the industry chart
  createIndustryChart(feature);

  // Set totals chart caption
  var totalsCaption = "Total employment for all industries in " + feature.properties.title + " in " + year;
  $("#totals-chart-caption").html(totalsCaption);

  // Create the totals chart
  createTotalsChart(feature);
}

function createOrUpdateLegend()
{
  if (!legend)
  {
    legend = L.control({position: 'bottomleft'});

    legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend');

      div.innerHTML += "<div><div class='legend-industry'></div><div class='legend-label' style='margin-top:3px;'>Industry</div></div><div class='clear'></div><div style='padding-bottom:10px;'></div>";
      div.innerHTML += "<div><div class='legend-total'></div><div class='legend-label' style='margin-top:4px;'>Total Employment</div></div>";

      return div;
    };

    legend.addTo(map);

  }

  $('.legend-industry').css('background', getColor(industry, false, 0.65));
  $('.legend-industry').css('border-color', getColor(industry));
}

function createArrows()
{
  var arrows = L.control({position: 'topleft'});

  arrows.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'arrows');

    div.innerHTML += "<a id='left-arrow' href=''><img src='/public/img/arrow-circle-left.svg'></a> <a id='right-arrow' href=''><img src='/public/img/arrow-circle-right.svg'></a>";

    return div;
  };

  arrows.addTo(map);
}

function clickedArrow(direction)
{
  console.log("Clicked arrow...");

  // Stop the click event
  event.preventDefault();

  var yearValue = parseInt($("#year-select").val());

  if (direction == "left")
  {
    if (yearValue > 2005)
      $("#year-select").val(yearValue - 1);
  } else if (direction == "right") {
    if (yearValue < 2016)
      $("#year-select").val(yearValue + 1);
  }

  // Trigger map update
  $("#year-select").change();
}

function createIndustryChart(feature)
{
  // If chart already exists, replace the canvas to nuke it
  if (industryChart)
  {
    $('#industry-chart').replaceWith('<canvas id="industry-chart" height="120"></canvas>');
    industryChartCanvas = $("#industry-chart");
  }

  var opacity = 0.65;
  var barColor = getColor(industry, false, opacity);
  var borderColor = getColor(industry, false, 1);

  industryChart = new Chart(industryChartCanvas, {
    type: 'bar',
    data: {
      labels: ["2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        data: [
          feature.properties[industry + "|2005"],
          feature.properties[industry + "|2006"],
          feature.properties[industry + "|2007"],
          feature.properties[industry + "|2008"],
          feature.properties[industry + "|2009"],
          feature.properties[industry + "|2010"],
          feature.properties[industry + "|2011"],
          feature.properties[industry + "|2012"],
          feature.properties[industry + "|2013"],
          feature.properties[industry + "|2014"],
          feature.properties[industry + "|2015"],
          feature.properties[industry + "|2016"]
        ],
        backgroundColor: [ barColor, barColor, barColor, barColor, barColor, barColor, barColor, barColor, barColor, barColor, barColor, barColor],
        borderColor: [borderColor, borderColor, borderColor, borderColor, borderColor, borderColor,borderColor, borderColor, borderColor, borderColor, borderColor, borderColor],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      },
      legend: {
        display: false
      }
    }
  });
}

function createTotalsChart(feature)
{
  // If chart already exists, replace the canvas to nuke it
  if (totalsChart)
  {
    $('#totals-chart').replaceWith('<canvas id="totals-chart" height="100"></canvas>');
    totalsChartCanvas = $("#totals-chart");
  }

  var opacity = 0.65;

  totalsChart = new Chart(totalsChartCanvas, {
    type: 'pie',
    data: {
      labels: [
        "Agriculture",
        "Construction",
        "Manufacturing",
        "Wholesale Trade",
        "Retail Trade",
        "Transportation and Warehousing",
        "Information",
        "Finance, Insurance, and Real Estate",
        "Professional, Scientific, and Management",
        "Educational Services and Healthcare",
        "Arts, Entertainment, and Recreation",
        "Public Administration",
        "Other Services"
      ],
      datasets: [{
        data: [
          feature.properties["EST_VC02|" + year],
          feature.properties["EST_VC03|" + year],
          feature.properties["EST_VC04|" + year],
          feature.properties["EST_VC05|" + year],
          feature.properties["EST_VC06|" + year],
          feature.properties["EST_VC07|" + year],
          feature.properties["EST_VC08|" + year],
          feature.properties["EST_VC09|" + year],
          feature.properties["EST_VC10|" + year],
          feature.properties["EST_VC11|" + year],
          feature.properties["EST_VC12|" + year],
          feature.properties["EST_VC14|" + year],
          feature.properties["EST_VC13|" + year],
        ],
        backgroundColor: [
          getColor("EST_VC02", false, opacity),
          getColor("EST_VC03", false, opacity),
          getColor("EST_VC04", false, opacity),
          getColor("EST_VC05", false, opacity),
          getColor("EST_VC06", false, opacity),
          getColor("EST_VC07", false, opacity),
          getColor("EST_VC08", false, opacity),
          getColor("EST_VC09", false, opacity),
          getColor("EST_VC10", false, opacity),
          getColor("EST_VC11", false, opacity),
          getColor("EST_VC12", false, opacity),
          getColor("EST_VC14", false, opacity),
          getColor("EST_VC13", false, opacity)
        ],
        borderColor: [
          getColor("EST_VC02", false, 1),
          getColor("EST_VC03", false, 1),
          getColor("EST_VC04", false, 1),
          getColor("EST_VC05", false, 1),
          getColor("EST_VC06", false, 1),
          getColor("EST_VC07", false, 1),
          getColor("EST_VC08", false, 1),
          getColor("EST_VC09", false, 1),
          getColor("EST_VC10", false, 1),
          getColor("EST_VC11", false, 1),
          getColor("EST_VC12", false, 1),
          getColor("EST_VC14", false, 1),
          getColor("EST_VC13", false, 1)
        ],
        borderWidth: 1
      }]
    },
    options: {
      legend: {
        position: 'right'
      }
    }
  });
}

// Create a GeoJSON layer and add it to the map
function createPropSymbols(data, property)
{
  return L.geoJson(data, {
    pointToLayer: function(feature, latlng)
    {
      var value = Number(feature.properties[property]);

      // Style the point symbol based on the default style
      pointStyle = defaultStyle;

      // Dynamically set some of the style properties
      pointStyle.radius = getRadius(value, property.split("|")[0]);
      pointStyle.color = getColor(property.split("|")[0]);
      pointStyle.fillColor = getColor(property.split("|")[0]);

      return L.circleMarker(latlng, pointStyle);
    },
    onEachFeature: onEachFeature
  }).bindTooltip(function (layer) {
      var total = layer.feature.properties["EST_VC01|" + year];
      var percent = Number.parseFloat((layer.feature.properties[industry + "|" + year] / total) * 100).toFixed(2);
      var tip = "<strong>" + layer.feature.properties.title + "</strong><br/> " + percent +"% of " + total.toLocaleString() + " total jobs<br/>Click for more information";
      return tip;
    }
  ).addTo(map);
}

// User changed industry -> update industry layer
function updateLayers()
{
  // Update the industry and year globals
  industry = $("#industry-select").val();
  year = $("#year-select").val();
  var withSelect = $("#totals-select").val();

  // Remove the totals layer
  map.removeLayer(totalsLayer);

  // Remove the current industry layer
  map.removeLayer(industryLayer);

  // Update the legend
  createOrUpdateLegend();

  // Create the new totals layer, if With is selected
  if (withSelect == "with")
    totalsLayer = createPropSymbols(mapData, "EST_VC01|" + year);

  // Create the new industry layer
  industryLayer = createPropSymbols(mapData, industry + "|" + year);
}

// User toggled with/without totals
function toggleTotals()
{
  var withSelect = $("#totals-select").val();

  if (withSelect == "with")
  {
    totalsLayer = createPropSymbols(mapData, "EST_VC01|" + year);
    industryLayer.bringToFront();
  }
  else {
    map.removeLayer(totalsLayer);
  }
}

// Set up dynamic sizing on selects
function setUpSelects()
{
  // Set up industry-select
  $("#compute_option").html($('#industry-select option:selected').text());
  $("#industry-select").width($("#compute_select").width());

  // Set up totals-select
  $("#compute_option").html($('#totals-select option:selected').text());
  $("#totals-select").width($("#compute_select").width());
}

// I spent way too much time on this...
function addEasterEgg()
{
  var imageUrl = '/public/img/yeti.svg';
  var imageBounds = [[63.266400, -155.764855], [65.029887, -151.700610]];

  L.imageOverlay(imageUrl, imageBounds, {
    zIndex: 1000
  }).addTo(map);
}

$(document).ready(function()
{
  // Create the map
  createMap();

  // Create the legend
  createOrUpdateLegend();

  // Create the sequence arrows
  createArrows();

  // Set up dynamic sizing on selects
  setUpSelects();

  addEasterEgg();

  // Identify chart elements
  industryChartCanvas = $("#industry-chart");
  totalsChartCanvas = $("#totals-chart");

  $("#industry-select").change(function() {
    updateLayers();

    // Resize select
    $("#compute_option").html($('#industry-select option:selected').text());
    $(this).width($("#compute_select").width());

    $(this).blur();

    // If has viewed a feature -> update charts
    if (currentFeature)
      createOrUpdateCharts(currentFeature);
  });

  $("#year-select").change(function() {
    updateLayers();

    $(this).blur();

    // If has viewed a feature -> update charts
    if (currentFeature)
      createOrUpdateCharts(currentFeature);
  });

  $("#totals-select").change(function() {
    toggleTotals();

    // Resize select
    $("#compute_option").html($('#totals-select option:selected').text());
    $(this).width($("#compute_select").width());

    $(this).blur();
  });

  //$('#left-arrow').html('<img src="/public/img/arrow-circle-left.svg">');
  //$('#right-arrow').html('<img src="/public/img/arrow-circle-right.svg">');

  $("#left-arrow").click(function() {
    clickedArrow('left');
  });

  $("#right-arrow").click(function() {
    clickedArrow('right');
  });
});
