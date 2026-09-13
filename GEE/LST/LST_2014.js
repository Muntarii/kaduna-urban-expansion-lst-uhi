// ==============================
// LANDSAT 8 – LST 2014 (KADUNA)
// ==============================

var lstImage2014 = Landsat8;

// NDVI
var ndvi2014 = lstImage2014
  .normalizedDifference(['B5', 'B4'])
  .rename('NDVI');

Map.addLayer(
  ndvi2014,
  {min: -0.2, max: 0.8, palette: ['blue','white','green']},
  'NDVI 2014'
);

// FVC
var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc2014 = ndvi2014
  .subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// Emissivity
var emissivity2014 = fvc2014
  .multiply(0.004)
  .add(0.986)
  .rename('Emissivity');

// Brightness temperature
var bt2014 = lstImage2014
  .select('B10');

// LST
var lst2014 = bt2014.expression(
  '(BT / (1 + (0.00115 * (BT / 1.438)) * log(E))) - 273.15', {
    'BT': bt2014,
    'E': emissivity2014
  }
).rename('LST');

Map.addLayer(
  lst2014,
  {
    min: 20,
    max: 45,
    palette: ['blue','cyan','green','yellow','red']
  },
  'LST 2014 (°C)'
);

// Export LST
Export.image.toDrive({
  image: lst2014,
  description: 'Kaduna_LST_2014',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_2014',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
