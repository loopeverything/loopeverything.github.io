---
layout:   project
title:    "Nitrate Values to Cancer Rates"
slug:     "nitrate-to-cancer"
subtitle: "Examining the relation between nitrate and cancer in Wisconsin"
date:     2018-06-01
category: projects
tags:
  - Leaflet
  - Turf.js
  - React
  - Node.js
  - Express
  - PostgreSQL
  - PostGIS
images:   2
app-link: "http://nitrate.alexthompson.work"
---
Turf.js was used to interpolate continuous surfaces for nitrate values and cancer rates in Wisconsin. The end result was a layer showing the standard deviation of the residuals after generating a linear regression model. 

The client application was created with React, with Leaflet powering the map. The backend consisted of a simple API served by Node/Express which pulled from a PostgreSQL/PostGIS database.