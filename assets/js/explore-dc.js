// const map;
var map;

// Layers
let museumsLayer = null;
// let monumentsLayer;
// let viewpointsLayer;
// let hotelsLayer;
// let restaurantsLayer;
// let reviewsLayer;

// let testLayer = null;

const init = () => {
  // $('#loading').hide();

  // Create the map
  map = L.map('map', {
    doubleClickZoom: false
  }).setView([38.889, -77.03], 15);

  // map.on('moveend', function () {
  //   updateMap();
  // });

  // Set the basemap
  // L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
  //   attribution: 'Map data &copy; <a href="http://mapbox.com">Mapbox</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
  //   id: 'mapbox.light',
  //   accessToken: 'pk.eyJ1IjoiYXRobXBzbiIsImEiOiJjajZ5bWVjOHgwNGp4MnhzZzMxa2pkeDBiIn0.MIHVmqU0AzpJTACceAr4Zg'
  // }).addTo(map);

  console.log('Done loading map');
};

const showSideBar = () => {
  $('#side-bar-wrapper').css('opacity', '0');
  $('#side-bar-wrapper').css('display', 'block');
  $('#side-bar-wrapper').animate({
    opacity: 1,
    right: "0"
  }, 400);
};

const getData = () => {

};

const loadLayer = () => {

};

$(function () {
  init();

  // Open side bar
  $('#side-bar-button-wrapper').click(() => {
    showSideBar();
  });

  // Close side bar
  $('#close-side-bar').click(() => {
    $('#side-bar-wrapper').animate({
      opacity: 0,
      right: "-200px"
    }, 400, () => {
      // Hide the side bar wrapper completely
      $('#side-bar-wrapper').css('display', 'none');
    });
  });
});