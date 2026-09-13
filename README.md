# kaduna-urban-expansion-lst-uhi
Google Earth Engine scripts for analysing urban expansion, land surface temperature and urban heat island formation in Kaduna, Nigeria, 1999–2024.
# Impacts of Urban Expansion on Land Surface Temperature and Urban Heat Island Formation in Kaduna, Nigeria

This repository contains Google Earth Engine (GEE) scripts used to analyse the impacts of urban expansion on Land Use/Land Cover (LULC), Land Surface Temperature (LST), and Urban Heat Island (UHI) formation in Kaduna, Nigeria, from 1999 to 2024.

## Study Area

Kaduna, Nigeria.

## Purpose

The scripts are provided to document the geospatial workflow used to examine urban expansion and its relationship with surface temperature in Kaduna.
## Study Period

The analysis covers four years:

- 1999
- 2004
- 2014
- 2024

## Main Analysis

The study consists of three main components:

### 1. Land Use/Land Cover Classification

Landsat imagery is classified into four LULC classes:

- Waterbody
- Built-up
- Vegetation
- Bareland

Random Forest classification is used for the Landsat 7 imagery for 1999 and 2004.

The 2014 and 2024 classifications use Landsat 8 imagery.

### 2. Land Surface Temperature

Land Surface Temperature is derived from Landsat thermal data for each study year.

The LST results are compared with the classified LULC to examine how different land-cover types relate to surface temperature.

### 3. Urban Heat Island Analysis

Changes in built-up areas and their relationship with LST are examined to assess the development of urban heat patterns in Kaduna.

## Repository Structure

```text
GEE/
├── LULC/
│   ├── LULC_1999.js
│   ├── LULC_2004.js
│   ├── LULC_2014.js
│   └── LULC_2024.js
│
├── LST/
│   ├── LST_1999.js
│   ├── LST_2004.js
│   ├── LST_2014.js
│   └── LST_2024.js
│
└── LULC_LST/
    ├── LULC_LST_1999.js
    ├── LULC_LST_2004.js
    ├── LULC_LST_2014.js
    └── LULC_LST_2024.js
