// ==============================
// LANDSAT 8 – LULC 2024 (KADUNA)
// ==============================

// Load Landsat 8 TOA
var Landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
  .filterDate('2024-01-01', '2024-12-30')
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
Map.addLayer(Landsat8, vis_par, 'Landsat 8 Composite 2024');

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
    palette: ['blue', 'red', 'green', 'lightgreen', 'yellow']
  },
  'Kaduna LULC 2024'
);

// ==============================
// ACCURACY ASSESSMENT
// ==============================

var validated = testSet.classify(classifier);

var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error Matrix 2024:', errorMatrix);
print('Overall Accuracy 2024:', errorMatrix.accuracy());
print('Kappa 2024:', errorMatrix.kappa());


// ==============================
// EXPORT ACCURACY TABLE
// ==============================

var accuracyTable = ee.Feature(null, {
  Year: 2024,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});

//Export.table.toDrive({
 // collection: ee.FeatureCollection([accuracyTable]),
  //description: 'Kaduna_Accuracy_2024',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_Accuracy_2024',
  //fileFormat: 'CSV'
//});

// ==============================
// LANDSAT 8 – LST 2024 (KADUNA)
// ==============================

// Use same AOI
// AOI already defined above

// Load Landsat 8 L2 (Surface Temperature)
var L8_LST = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(AOI)
  .filterDate('2024-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 5))
  .median()
  .clip(AOI);

// ==============================
// SCALE LST BAND
// ==============================

// ST_B10 scale factor
var lstKelvin = L8_LST
  .select('ST_B10')
  .multiply(0.00341802)
  .add(149.0);

// Convert to Celsius
var lstCelsius = lstKelvin.subtract(273.15);

// ==============================
// DISPLAY LST
// ==============================

Map.addLayer(
  lstCelsius,
  {
    min: 20,
    max: 45,
    palette: ['blue','cyan','green','yellow','red']
  },
  'LST 2024 (°C)'
);

// ==============================
// EXPORT LST
// ==============================

//Export.image.toDrive({
 // image: lstCelsius,
 // description: 'Kaduna_LST_2024',
 // folder: 'GEE_Exports',
 // fileNamePrefix: 'Kaduna_LST_2024',
 // region: AOI,
 // scale: 30,
 // crs: 'EPSG:4326',
//  maxPixels: 1e13
//});

// ============================================
// LST PER LULC CLASS – 2024
// Class codes:
// 0 = Waterbody
// 1 = Built-up
// 2 = Vegetation
// 3 = Bareland
// ============================================

// Mask LST by LULC class
var LST_Water_2024 = lstCelsius.updateMask(classified.eq(0));
var LST_Builtup_2024 = lstCelsius.updateMask(classified.eq(1));
var LST_Vegetation_2024 = lstCelsius.updateMask(classified.eq(2));
var LST_Bareland_2024 = lstCelsius.updateMask(classified.eq(3));

// Display maps
Map.addLayer(LST_Water_2024, {min:20, max:40, palette:['blue','cyan']}, 'LST Waterbody 2024');
Map.addLayer(LST_Builtup_2024, {min:25, max:50, palette:['yellow','orange','red']}, 'LST Built-up 2024');
Map.addLayer(LST_Vegetation_2024, {min:20, max:40, palette:['green','yellow']}, 'LST Vegetation 2024');
Map.addLayer(LST_Bareland_2024, {min:25, max:48, palette:['brown','orange','red']}, 'LST Bareland 2024');

// Mean LST per class
var meanWater = LST_Water_2024.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanBuiltup = LST_Builtup_2024.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanVegetation = LST_Vegetation_2024.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

var meanBareland = LST_Bareland_2024.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

// Print results
print('Mean LST Waterbody 2024', meanWater);
print('Mean LST Built-up 2024', meanBuiltup);
print('Mean LST Vegetation 2024', meanVegetation);
print('Mean LST Bareland 2024', meanBareland);

// Export mean LST table
var meanLSTTable = ee.Feature(null, {
  Year: 2024,
  Waterbody: meanWater.get('ST_B10'),
  Builtup: meanBuiltup.get('ST_B10'),
  Vegetation: meanVegetation.get('ST_B10'),
  Bareland: meanBareland.get('ST_B10')
});

Export.table.toDrive({
  collection: ee.FeatureCollection([meanLSTTable]),
  description: 'Kaduna_Mean_LST_LULC_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_Mean_LST_LULC_2024',
  fileFormat: 'CSV'
});

// Export LST maps per class
Export.image.toDrive({
  image: LST_Water_2024,
  description: 'Kaduna_LST_Waterbody_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Waterbody_2024',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Builtup_2024,
  description: 'Kaduna_LST_Builtup_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Builtup_2024',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Vegetation_2024,
  description: 'Kaduna_LST_Vegetation_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Vegetation_2024',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Bareland_2024,
  description: 'Kaduna_LST_Bareland_2024',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Bareland_2024',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
