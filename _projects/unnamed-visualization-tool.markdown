---
layout:   project
title:    "Unnamed Visualization Tool"
slug:     "unnamed-visualization-tool"
subtitle: "Web-based geospatial visualization"
date:     2018-08-28
category: projects
tags:
  - Node.js
  - React
  - Redux
  - Leaflet
  - Turf
videos:
  - https://www.youtube.com/watch?v=g5bg9rKTVoM
images:   2
app-link: "http://alexthompson.work/uvt/"
---
The Unnamed Visualization Tool was created as the practicum for my master's degree. The project goal was to build a web-based application for easily visualizing geospatial features and data. It targets casual users: those who have a need for basic geospatial visualization and analysis, but who might not have experience with or access to traditional desktop tools.

It took roughly three weeks to create the application. The visual look and basic functionality were inspired by the excellent Kepler.gl tool, built by Uber's Visualization team.

The interface was created almost entirely with React. About the only exception is the map component itself, which is powered by Leaflet. The internal application state is managed by Redux, while the Turf.js library handles most of the functionality for the geospatial analysis tools.