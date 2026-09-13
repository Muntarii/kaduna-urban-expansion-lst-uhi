// ==============================
// LANDSAT 7 – LST 2004 (KADUNA)
// ==============================

var lstImage2004 = image2004;

// NDVI
var ndvi2004 = lstImage2004
  .normalizedDifference(['SR_B4', 'SR_B3'])
  .rename('NDVI');

Map.addLayer(
  ndvi2004,
  {min: -0.2, max: 0.8, palette: ['blue','white','green']},
  'NDVI 2004'
);

// FVC
var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc2004 = ndvi2004.subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// Emissivity
var emissivity2004 = fvc2004
  .multiply(0.004)
  .add(0.986)
  .rename('Emissivity');

// Brightness temperature
var bt2004 = lstImage2004.select('ST_B6')
  .multiply(0.00341802)
  .add(149.0)
  .rename('BT');

// LST
var lst2004 = bt2004.expression(
  '(BT / (1 + (0.00115 * (BT / 1.438)) * log(E))) - 273.15', {
    'BT': bt2004,
    'E': emissivity2004
  }
).rename('LST');

Map.addLayer(
  lst2004,
  {min: 20, max: 45, palette: ['blue','cyan','green','yellow','red']},
  'LST 2004 (°C)'
);

// Export LST
Export.image.toDrive({
  image: lst2004,
  description: 'Kaduna_LST_2004',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_2004',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
