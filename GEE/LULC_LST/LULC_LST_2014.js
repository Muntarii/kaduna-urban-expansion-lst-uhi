// ==============================
// LANDSAT 8 – LULC 2014 (KADUNA)
// ==============================

// Load Landsat 8 TOA
var Landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
  .filterDate('2014-01-01', '2014-12-30')
  .filterMetadata('CLOUD_COVER', 'less_than', 5)
  .filterBounds(AOI)
  .median()
  .clip(AOI);

// Visualisation
var vis_par = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000,
  gamma: 1.4
};

Map.centerObject(AOI, 10);
Map.addLayer(Landsat8, vis_par, 'Landsat 8 Composite 2014');

// ==============================
// TRAINING DATA
// ==============================

var label = 'Class';

// Landsat 8 TOA bands
var bands = [
  'B1','B2','B3','B4','B5','B7','B8','B9','B10','B11'
];

var input = Landsat8.select(bands);

var training = Vegetation
  .merge(Bareland)
  .merge(Waterbody)
  .merge(builtup);

print('Training features:', training);

// ==============================
// SAMPLE REGIONS
// ==============================

var samples = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});

print('Samples:', samples);

// ==============================
// TRAIN / TEST SPLIT
// ==============================

var withRandom = samples.randomColumn('random');

var trainSet = withRandom.filter(ee.Filter.lt('random', 0.8));
var testSet  = withRandom.filter(ee.Filter.gte('random', 0.8));

// ==============================
// CLASSIFICATION
// ==============================

var classifier = ee.Classifier.smileCart()
  .train({
    features: trainSet,
    classProperty: label,
    inputProperties: bands
  });

var classified = input.classify(classifier);

// Display classification
Map.addLayer(
  classified,
  {
    min: 0,
    max: 4,
    palette: ['blue', 'red', 'green', 'lightgreen']
  },
  'Kaduna LULC 2014'
);

// ==============================
// ACCURACY ASSESSMENT
// ==============================

var validated = testSet.classify(classifier);

var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error Matrix 2014:', errorMatrix);
print('Overall Accuracy 2014:', errorMatrix.accuracy());
print('Kappa 2014:', errorMatrix.kappa());

// ==============================
// EXPORT LULC
// ==============================


// ==============================
// EXPORT ACCURACY TABLE
// ==============================

var accuracyTable = ee.Feature(null, {
  Year: 2014,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});

//Export.table.toDrive({
  //collection: ee.FeatureCollection([accuracyTable]),
  //description: 'Kaduna_Accuracy_2014',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_Accuracy_2014',
  //fileFormat: 'CSV'
//});
// ==============================
// LANDSAT 8 – LST 2014 (KADUNA)
// ==============================

// Use the same Landsat 8 composite
var lstImage = Landsat8;

// ==============================
// NDVI
// ==============================

var ndvi = lstImage.normalizedDifference(['B5', 'B4']).rename('NDVI');

Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['blue','white','green']}, 'NDVI 2014');

// ==============================
// FRACTIONAL VEGETATION COVER (FVC)
// ==============================

var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc = ndvi.subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// ==============================
// EMISSIVITY
// ==============================

var emissivity = fvc.multiply(0.004).add(0.986).rename('Emissivity');

// ==============================
// BRIGHTNESS TEMPERATURE
// ==============================

// Band 10 brightness temperature (Kelvin)
var bt = lstImage.select('B10');

// ==============================
// LAND SURFACE TEMPERATURE (°C)
// ==============================

var lst = bt.expression(
  '(BT / (1 + (0.00115 * (BT / 1.438)) * log(E))) - 273.15', {
    'BT': bt,
    'E': emissivity
  }
).rename('LST');

Map.addLayer(
  lst,
  {min: 20, max: 45, palette: ['blue','cyan','green','yellow','red']},
  'LST 2014 (°C)'
);

// ==============================
// EXPORT LST
// ==============================

//Export.image.toDrive({
 // image: lst,
  //description: 'Kaduna_LST_2014',
  //folder: 'GEE_Exports',
 // fileNamePrefix: 'Kaduna_LST_2014',
 // region: AOI,
 // scale: 30,
 // crs: 'EPSG:4326',
  //maxPixels: 1e13
//});

// ==============================
// LST PER LULC CLASS (2014) + MEAN LST
// ==============================

// Class codes
// 0 = Waterbody
// 1 = Built-up
// 2 = Vegetation
// 3 = Bareland

var LST_Water_2014 = lst.updateMask(classified.eq(0));
var LST_Builtup_2014 = lst.updateMask(classified.eq(1));
var LST_Vegetation_2014 = lst.updateMask(classified.eq(2));
var LST_Bareland_2014 = lst.updateMask(classified.eq(3));

// ==============================
// MEAN LST PER CLASS
// ==============================

var meanLST_Water = LST_Water_2014.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanLST_Builtup = LST_Builtup_2014.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanLST_Vegetation = LST_Vegetation_2014.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanLST_Bareland = LST_Bareland_2014.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

print('Mean LST Waterbody 2014:', meanLST_Water);
print('Mean LST Built-up 2014:', meanLST_Builtup);
print('Mean LST Vegetation 2014:', meanLST_Vegetation);
print('Mean LST Bareland 2014:', meanLST_Bareland);

// ==============================
// DISPLAY
// ==============================

Map.addLayer(LST_Water_2014,
  {min:20, max:40, palette:['blue','cyan']},
  'LST Waterbody 2014'
);

Map.addLayer(LST_Builtup_2014,
  {min:25, max:50, palette:['yellow','orange','red']},
  'LST Built-up 2014'
);

Map.addLayer(LST_Vegetation_2014,
  {min:20, max:40, palette:['green','yellow']},
  'LST Vegetation 2014'
);

Map.addLayer(LST_Bareland_2014,
  {min:25, max:48, palette:['brown','orange','red']},
  'LST Bareland 2014'
);

// ==============================
// EXPORT CLASS MAPS
// ==============================

Export.image.toDrive({
  image: LST_Water_2014,
  description: 'Kaduna_LST_Waterbody_2014',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Waterbody_2014',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Builtup_2014,
  description: 'Kaduna_LST_Builtup_2014',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Builtup_2014',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Vegetation_2014,
  description: 'Kaduna_LST_Vegetation_2014',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Vegetation_2014',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Bareland_2014,
  description: 'Kaduna_LST_Bareland_2014',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Bareland_2014',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
