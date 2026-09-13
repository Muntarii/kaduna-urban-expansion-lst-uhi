// ==============================
// LANDSAT 8 – LST 2024 (KADUNA)
// ==============================

var L8_LST = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(AOI)
  .filterDate('2024-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 5))
  .median()
  .clip(AOI);

var lstKelvin = L8_LST
  .select('ST_B10')
  .multiply(0.00341802)
  .add(149.0);

var lstCelsius = lstKelvin.subtract(273.15);

Map.addLayer(
  lstCelsius,
  {
    min: 20,
    max: 45,
    palette: ['blue','cyan','green','yellow','red']
  },
  'LST 2024 (°C)'
);

Export.image.toDrive({
  image: lstCelsius,
  description: 'Kaduna_LST_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_2024',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
