// Load Landsat 7
var L7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
  .filterDate('1999-01-01', '1999-12-31')
  .filterBounds(AOI.buffer(50000))
  .filter(ee.Filter.lt('CLOUD_COVER', 20));

print('Landsat 7 count 1999:', L7.size());

// Create single image
var image1999 = L7.median().clip(AOI);

// Display RGB
Map.centerObject(AOI, 9);
Map.addLayer(
  image1999,
  {bands:['SR_B3','SR_B2','SR_B1'], min:0, max:0.3, gamma:1.4},
  'Landsat 7 – 1999'
);

// ==============================
// TRAINING DATA
// ==============================

var label = 'Class';

// Correct Landsat 7 SR bands
var bands = [
  'SR_B1','SR_B2','SR_B3',
  'SR_B4','SR_B5','SR_B7'
];

// IMPORTANT: use IMAGE, not ImageCollection
var input = image1999.select(bands);

// Merge training polygons
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

var classifier = ee.Classifier.smileRandomForest(200)
  .train({
    features: trainSet,
    classProperty: label,
    inputProperties: bands
  });

var classified = input.classify(classifier);

// ==============================
// ACCURACY ASSESSMENT
// ==============================

var validated = testSet.classify(classifier);
var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error matrix 1999:', errorMatrix);
print('Overall accuracy 1999:', errorMatrix.accuracy());
print('Kappa 1999:', errorMatrix.kappa());
var accuracyTable = ee.Feature(null, {
  Year: 1999,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});

var accuracyFC = ee.FeatureCollection([accuracyTable]);

// ==============================
// DISPLAY RESULT
// ==============================

Map.addLayer(
  classified,
  {
    min: 0,
    max: 3,
    palette: ['blue', 'red', 'green', 'yellow']
  },
  'Kaduna LULC 1999'
);
//Export.table.toDrive({
//  collection: accuracyFC,
  //description: 'Kaduna_Accuracy_1999',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_Accuracy_1999',
  //fileFormat: 'CSV'
//});
// ==============================
// LANDSAT 7 – LST 1999 (KADUNA)
// ==============================

// Use the same composite you already created
var lstImage1999 = image1999;

// ==============================
// NDVI
// ==============================

var ndvi1999 = lstImage1999
  .normalizedDifference(['SR_B4', 'SR_B3'])
  .rename('NDVI');

Map.addLayer(
  ndvi1999,
  {min: -0.2, max: 0.8, palette: ['blue','white','green']},
  'NDVI 1999'
);

// ==============================
// FRACTIONAL VEGETATION COVER
// ==============================

var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc1999 = ndvi1999.subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// ==============================
// SURFACE EMISSIVITY
// ==============================

var emissivity1999 = fvc1999
  .multiply(0.004)
  .add(0.986)
  .rename('Emissivity');

// ==============================
// BRIGHTNESS TEMPERATURE (K)
// ==============================

var bt1999 = lstImage1999.select('ST_B6')
  .multiply(0.00341802)
  .add(149.0)
  .rename('BT');

// ==============================
// LAND SURFACE TEMPERATURE (°C)
// ==============================

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

// ==============================
// EXPORT LST
// ==============================

//Export.image.toDrive({
  //image: lst1999,
  //description: 'Kaduna_LST_1999',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_LST_1999',
  //region: AOI,
  //scale: 30,
  //crs: 'EPSG:4326',
  //maxPixels: 1e13
//});

// ==============================
// LULC–LST RELATIONSHIP (1999)
// FINAL FIX
// ==============================

// Stack bands in the CORRECT order
// Band 0 = LST
// Band 1 = LULC
var lulcLST_1999 = lst1999.rename('LST')
  .addBands(classified.rename('LULC'));

// Reducer
var reducer = ee.Reducer.mean().group({
  groupField: 1,      // LULC band index
  groupName: 'LULC'
});

// Reduce region
var stats1999 = lulcLST_1999.reduceRegion({
  reducer: reducer,
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});

print('LULC–LST stats 1999', stats1999);

// Convert to table
var table1999 = ee.FeatureCollection(
  ee.List(stats1999.get('groups')).map(function(d) {
    d = ee.Dictionary(d);
    return ee.Feature(null, {
      Year: 1999,
      LULC: d.get('LULC'),
      Mean_LST_C: d.get('mean')
    });
  })
);

// ==============================
// EXPORT
// ==============================

//Export.table.toDrive({
  //collection: table1999,
 // description: 'LULC_LST_1999',
 // folder: 'GEE_Exports',
 // fileNamePrefix: 'LULC_LST_1999',
 // fileFormat: 'CSV'
//});

// ==============================
// LULC–LST RELATIONSHIP (1999)
// ==============================

// Class values
// 0 = Waterbody
// 1 = Built-up
// 2 = Vegetation
// 3 = Bareland

// Mask LST by LULC classes
var LST_Water_1999 = lst1999.updateMask(classified.eq(0));
var LST_Builtup_1999 = lst1999.updateMask(classified.eq(1));
var LST_Vegetation_1999 = lst1999.updateMask(classified.eq(2));
var LST_Bareland_1999 = lst1999.updateMask(classified.eq(3));

// ==============================
// DISPLAY MAPS
// ==============================

Map.addLayer(LST_Water_1999,
  {min:20, max:45, palette:['blue','cyan']},
  'LST Waterbody 1999');

Map.addLayer(LST_Builtup_1999,
  {min:25, max:50, palette:['yellow','orange','red']},
  'LST Built-up 1999');

Map.addLayer(LST_Vegetation_1999,
  {min:20, max:40, palette:['green','yellow']},
  'LST Vegetation 1999');

Map.addLayer(LST_Bareland_1999,
  {min:25, max:48, palette:['brown','orange','red']},
  'LST Bareland 1999');

// ==============================
// EXPORT SETTINGS
// ==============================

var exportRegion = AOI;
var exportScale = 30;
var exportCRS = 'EPSG:4326';

// ==============================
// EXPORT LST PER CLASS
// ==============================

Export.image.toDrive({
  image: LST_Water_1999,
  description: 'Kaduna_LST_Waterbody_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Waterbody_1999',
  region: exportRegion,
  scale: exportScale,
  crs: exportCRS,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Builtup_1999,
  description: 'Kaduna_LST_Builtup_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Builtup_1999',
  region: exportRegion,
  scale: exportScale,
  crs: exportCRS,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Vegetation_1999,
  description: 'Kaduna_LST_Vegetation_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Vegetation_1999',
  region: exportRegion,
  scale: exportScale,
  crs: exportCRS,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Bareland_1999,
  description: 'Kaduna_LST_Bareland_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Bareland_1999',
  region: exportRegion,
  scale: exportScale,
  crs: exportCRS,
  maxPixels: 1e13
});


