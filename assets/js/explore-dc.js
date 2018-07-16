let map;

// Path to API backend
// const api = 'http://localhost:3002';
const api = 'http://206.189.163.171:3002';

// Flags
let isSideBarOpen = false;
let isViewingSearchFeatures = false;

// Layers and markers
let userMarker = null;
let currentQuery = null;
let currentLayer = null;
let currentLayerText = null;
let currentOsmID = null;
let currentFeatureType = null;

// Default marker style
this.defaultMarkerStyle = {
  radius: 7,
  fillColor: '#0072ff',
  color: '#ffffff',
  weight: 2,
  opacity: 1,
  fillOpacity: 0.8,
  pane: 'markerPane'
};

//-----------------------------------------------------------------------------
// Loading Layers
//-----------------------------------------------------------------------------

// Load a feature layer
const loadLayer = (layer) => {
  $('#loading').show();
  isViewingSearchFeatures = false;
  currentLayerText = layer;

  // Remove old layer from the map
  if (currentLayer)
    map.removeLayer(currentLayer);

  // Get current position of the user marker and the selected distance
  let lat = userMarker.getLatLng().lat;
  let long = userMarker.getLatLng().lng;
  let distance = getDistance();

  $.ajax(api + '/gis/' + layer + '/' + lat + '/' + long + '/' + distance)
    .done(function (data) {
      data = parseData(data);

      // If there are features visible in the current extent -> add them to the map
      if (data != null) {
        const markerStyle = defaultMarkerStyle; // Get the default style for markers

        currentLayer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, markerStyle);
          },
          onEachFeature: (feature, layer) => {
            layer.on("click", function (e) {
              onFeatureClick(feature, layer);
            });
          }
        }).bindTooltip(function (ele) {
          return buildTooltip(ele.feature);
        }, {
            sticky: true,
            direction: 'top',
            offset: [0, -2]
          }).addTo(map);
      }

      $('#loading').hide();
    })
    .fail(function () {
      // FIXME: Seems like the AJAX abort() is triggering the fail call; maybe have a wasAborted bool?
      // message('Unable to load features', true);
      console.log('Data pull failed');
      return;
    });
};

// Show search results layer
const loadSearchLayer = (q) => {
  $('#loading').show();
  isViewingSearchFeatures = true;
  currentQuery = q;

  // Remove old layer from the map
  if (currentLayer)
    map.removeLayer(currentLayer);

  // Get current position of the user marker and the selected distance
  let lat = userMarker.getLatLng().lat;
  let long = userMarker.getLatLng().lng;
  let distance = getDistance();

  $.ajax(api + '/gis/find/' + q + '/' + lat + '/' + long + '/' + distance)
    .done(function (data) {
      data = parseData(data);

      // If there are features visible in the current extent -> add them to the map
      if (data != null) {
        const markerStyle = defaultMarkerStyle; // Get the default style for markers

        currentLayer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, markerStyle);
          },
          onEachFeature: (feature, layer) => {
            layer.on("click", function (e) {
              onFeatureClick(feature, layer);
            });
          }
        }).bindTooltip((ele) => {
          return buildTooltip(ele.feature);
        }, {
            sticky: true,
            direction: 'top',
            offset: [0, -2]
          }).addTo(map);
      }

      $('#loading').hide();
    })
    .fail(function () {
      // FIXME: Seems like the AJAX abort() is triggering the fail call; maybe have a wasAborted bool?
      // message('Unable to load features', true);
      console.log('Data pull failed');
      return;
    });
};

const buildTooltip = (feature) => {
  return (feature.properties.name) ? feature.properties.name : 'Viewpoint';
};

//-----------------------------------------------------------------------------
// Features
//-----------------------------------------------------------------------------

const onFeatureClick = (feature, layer) => {
  viewFeature(feature);
};

const viewFeature = (feature) => {
  $('#loading').show();
  currentOsmID = feature.id;
  currentFeatureType = feature.properties.feature_type;

  // If the side bar isn't open -> open it
  if (!isSideBarOpen)
    openSideBar();

  const name = feature.properties.name;
  const street = feature.properties.street;
  const city = feature.properties.city;
  const state = feature.properties.state;
  const postcode = feature.properties.postcode;
  const website = feature.properties.website;
  const wikipedia = feature.properties.wikipedia;

  // Set the feature body
  let output = "<p><a id='feature-back-link'>Go back</a></p>";
  output += "<h5>" + name + "</h5>";

  if (street && street != 'null')
    output += "<p>" + street + "</p>";

  if (city && city != 'null' && state && state != 'null' && postcode && postcode != 'null')
    output += "<p>" + city + ", " + state + " " + postcode + "</p>";

  if (website && website != 'null')
    output += "<p><a target='_blank' href='" + website + "'>Website</a></p>";

  if (wikipedia && wikipedia != 'null')
    output += "<p><a target='_blank' href='https://en.wikipedia.org/wiki/" + wikipedia + "'>Wikipedia</a></p>";

  $('#feature-body').html(output);

  // Bind the back link
  $('#feature-back-link').click(() => {
    closeFeature();
  });

  // Load recommendations, if any, for the loaded feature
  loadRecommendations(feature.id);

  $('#search-body').hide(); // Hide the search body
  $('#feature-body').show(); // Show the feature body
  $('#loading').hide();
};

const closeFeature = () => {
  $('#recommendations').hide(); // Hide the recommendations div
  $('#feature-body').hide(); // Make sure the feature body is hidden
  $('#search-body').show(); // Make sure the search body is shown

  // Reset the saved values
  currentOsmID = null;
  currentFeatureType = null;
};

//-----------------------------------------------------------------------------
// Recommendations
//-----------------------------------------------------------------------------

// Load recommendations for the passed OSM ID
const loadRecommendations = (id) => {
  $('#loading').show();

  $.ajax(api + '/recommendations/' + id)
    .done((data) => {
      if (data.length > 0) {
        let output ='';
        for (var i = 0; i < data.length; i++) {
          output += "<p class='recommendation'>" + data[i].body + "</p>";
        }
        $('#recommendations-body').html(output);
      } else {
        let output = "<p>No recommendations yet</p>";
        $('#recommendations-body').html(output);
      }
    }).fail(() => {
      console.log('Unable to retrieve recommendations');
      return;
    });

  $('#recommendations').show(); // Show the recommendations div
  $('#loading').hide();
};

//-----------------------------------------------------------------------------
// Side Bar
//-----------------------------------------------------------------------------

const openSideBar = () => {
  $('#side-bar-wrapper').css('opacity', '0');
  $('#side-bar-wrapper').css('display', 'block');
  $('#side-bar-wrapper').animate({
    opacity: 1,
    right: "0"
  }, 400);

  $('#close-side-bar-button-wrapper').css('display', 'table');

  isSideBarOpen = true;
};

const closeSideBar = () => {
  $('#side-bar-wrapper').animate({
    opacity: 0,
    right: "-200px"
  }, 400, () => {
    $('#side-bar-wrapper').css('display', 'none');

    closeFeature();
  });

  $('#close-side-bar-button-wrapper').css('display', 'none');

  isSideBarOpen = false;
};

//-----------------------------------------------------------------------------
// Utility
//-----------------------------------------------------------------------------

// Since we're obviously not in DC -> simulate the user location
const addUserMarker = () => {
  // Add a new marker at the click location
  userMarker = new L.marker([38.889, -77.03], {
    draggable: true
  }).on('dragend', checkForUpdate).addTo(map);
};

// Does the map need to be updated?
const checkForUpdate = () => {
  // If there is a loaded layer -> update the features
  if (currentLayerText) {
    if (isViewingSearchFeatures)
      loadSearchLayer(currentQuery);
    else
      loadLayer(currentLayerText);
  }
};

// Get the 'within' distance value
const getDistance = () => {
  let distance = $('.ui.dropdown').dropdown('get value');
  if (!distance) distance = 25;
  
  return distance;
};

// Return just the features
const parseData = data => {
  return data[0].jsonb_build_object.features;
};

//-----------------------------------------------------------------------------
// Init
//-----------------------------------------------------------------------------

const init = () => {
  $('#loading').hide();

  // Create the map
  map = L.map('map', {
    doubleClickZoom: false
  }).setView([38.889, -77.03], 15);

  // L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
  //   attribution: 'Map data &copy; <a href="http://mapbox.com">Mapbox</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
  //   id: 'mapbox.light',
  //   accessToken: 'pk.eyJ1IjoiYXRobXBzbiIsImEiOiJjajZ5bWVjOHgwNGp4MnhzZzMxa2pkeDBiIn0.MIHVmqU0AzpJTACceAr4Zg'
  // }).addTo(map);

  // Set the basemap
  L.tileLayer('https://api.mapbox.com/styles/v1/athmpsn/cj8sooja8coot2rpecuuja864/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYXRobXBzbiIsImEiOiJjajZ5bWVjOHgwNGp4MnhzZzMxa2pkeDBiIn0.MIHVmqU0AzpJTACceAr4Zg', {
    attribution: 'Map data &copy; <a href="http://mapbox.com">Mapbox</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map);
};

$(() => {
  init();

  addUserMarker();

  $('#side-bar-button-wrapper').click(() => {
    openSideBar();
  });

  $('#close-side-bar-button-wrapper').click(() => {
    closeSideBar();
  });

  $('#museums-link').click(() => {
    loadLayer('museums');
  });

  $('#monuments-link').click(() => {
    loadLayer('monuments');
  });

  $('#viewpoints-link').click(() => {
    loadLayer('viewpoints');
  });

  $('#hotels-link').click(() => {
    loadLayer('hotels');
  });

  $('#restaurants-link').click(() => {
    loadLayer('restaurants');
  });

  $('#recommendation-form').submit((e) => {
    e.preventDefault();

    // Show the loading image for the form
    $('#recommendation-form').addClass('loading');

    var data = {};
    data.osm_id = currentOsmID;
    data.feature_type = currentFeatureType;
    data.recommendation = $.trim($('#recommendation').val());

    $.ajax({
      method: 'POST',
      url: api + '/recommendation/add',
      data: data
    }).done((msg) => {
        $('#recommendation').val(null);

        // Hide the loading image for the form
        $('#recommendation-form').removeClass('loading');

        loadRecommendations(currentOsmID);
      });
  });

  $('#search-form').submit((e) => {
    e.preventDefault();

    let distance = getDistance();
    console.log('Distance: ' + distance);

    let q = $.trim($('#search-query').val());
    if (q)
      loadSearchLayer(q);
  });

  $('.ui.dropdown').dropdown({
    onChange: function (value) {
      checkForUpdate();
    }
  });
});