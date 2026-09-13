// ==============================
// LANDSAT 7 – LST 1999 (KADUNA)
// ==============================

var lstImage1999 = image1999;

// NDVI
var ndvi1999 = lstImage1999
  .normalizedDifference(['SR_B4', 'SR_B3'])
  .rename('NDVI');

Map.addLayer(
  ndvi1999,
  {min: -0.2, max: 0.8, palette: ['blue','white','green']},
  'NDVI 1999'
);

// FVC
var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc1999 = ndvi1999.subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// Emissivity
var emissivity1999 = fvc1999
  .multiply(0.004)
  .add(0.986)
  .rename('Emissivity');

// Brightness temperature
var bt1999 = lstImage1999.select('ST_B6')
  .multiply(0.00341802)
  .add(149.0)
  .rename('BT');

// LST
var lst1999 = bt1999.expression(
  '(BT / (1 + (0.00115 * (BT / 1.438)) * log(E))) - 273.15', {
    'BT': bt1999,
    'E': emissivity1999
  }
).rename('LST');

Map.addLayer(
  lst1999,
  {min: 20, max: 45, palette: ['blue','cyan','green','yellow','red']},
  'LST 1999 (°C)'
);

// Export LST
Export.image.toDrive({
  image: lst1999,
  description: 'Kaduna_LST_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_1999',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
