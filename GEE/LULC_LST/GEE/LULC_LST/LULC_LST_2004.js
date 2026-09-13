// ==============================
// LANDSAT 7 ETM+ (2004) – KADUNA
// ==============================

// Load Landsat 7
var L7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
  .filterBounds(AOI)
  .filterDate('2004-01-01', '2004-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 5));

// Check availability
print('Landsat 7 image count:', L7.size());

// Create composite
var image2004 = L7.median().clip(AOI);

// ==============================
// APPLY SCALE FACTORS
// ==============================

function scaleL7(img) {
  var optical = img.select(
    ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7']
  ).multiply(0.0000275).add(-0.2);

  return img.addBands(optical, null, true);
}

image2004 = scaleL7(image2004);

// ==============================
// DISPLAY
// ==============================

Map.centerObject(AOI, 9);
Map.addLayer(
  image2004,
  {bands:['SR_B3','SR_B2','SR_B1'], min:0, max:0.3},
  'Landsat 7 – 2004'
);

// ==============================
// TRAINING DATA
// ==============================

var label = 'Class';

var bands = [
  'SR_B1','SR_B2','SR_B3',
  'SR_B4','SR_B5','SR_B7'
];

var input = image2004.select(bands);

var training = Vegetation
  .merge(Bareland)
  .merge(Waterbody)
  .merge(builtup);

// ==============================
// SAMPLE REGIONS
// ==============================

var samples = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});

// ==============================
// TRAIN / TEST SPLIT
// ==============================

var withRandom = samples.randomColumn('random');

var trainSet = withRandom.filter(ee.Filter.lt('random', 0.8));
var testSet  = withRandom.filter(ee.Filter.gte('random', 0.8));

// ==============================
// CLASSIFIER
// ==============================

var classifier = ee.Classifier.smileRandomForest(200)
  .train({
    features: trainSet,
    classProperty: label,
    inputProperties: bands
  });

// ==============================
// CLASSIFICATION
// ==============================

var classified = input.classify(classifier);

// ==============================
// ACCURACY ASSESSMENT
// ==============================

var validated = testSet.classify(classifier);

var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error Matrix 2004:', errorMatrix);
print('Overall Accuracy 2004:', errorMatrix.accuracy());
print('Kappa 2004:', errorMatrix.kappa());

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
  'Kaduna LULC 2004'
);



// ==============================
// EXPORT ACCURACY TABLE
// ==============================

var accuracyTable = ee.Feature(null, {
  Year: 2004,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});

//Export.table.toDrive({
  //collection: ee.FeatureCollection([accuracyTable]),
  //description: 'Kaduna_Accuracy_2004',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_Accuracy_2004',
  //fileFormat: 'CSV'
//});

// ==============================
// LANDSAT 7 – LST 2004 (KADUNA)
// ==============================

// Use the same 2004 composite
var lstImage2004 = image2004;

// ==============================
// NDVI
// ==============================

var ndvi2004 = lstImage2004
  .normalizedDifference(['SR_B4', 'SR_B3'])
  .rename('NDVI');

Map.addLayer(
  ndvi2004,
  {min: -0.2, max: 0.8, palette: ['blue','white','green']},
  'NDVI 2004'
);

// ==============================
// FRACTIONAL VEGETATION COVER
// ==============================

var ndviMin = -0.2;
var ndviMax = 0.8;

var fvc2004 = ndvi2004.subtract(ndviMin)
  .divide(ndviMax - ndviMin)
  .pow(2)
  .rename('FVC');

// ==============================
// EMISSIVITY
// ==============================

var emissivity2004 = fvc2004
  .multiply(0.004)
  .add(0.986)
  .rename('Emissivity');

// ==============================
// BRIGHTNESS TEMPERATURE (K)
// ==============================

// Landsat 7 thermal band
var bt2004 = lstImage2004.select('ST_B6')
  .multiply(0.00341802)
  .add(149.0)
  .rename('BT');

// ==============================
// LAND SURFACE TEMPERATURE (°C)
// ==============================

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

// ==============================
// EXPORT LST
// ==============================

//Export.image.toDrive({
  //image: lst2004,
  //description: 'Kaduna_LST_2004',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_LST_2004',
  //region: AOI,
  //scale: 30,
  //crs: 'EPSG:4326',
  //maxPixels: 1e13
//});

// ==============================
// LULC–LST PER CLASS (2004)
// ==============================

// Class codes
// 0 = Waterbody
// 1 = Built-up
// 2 = Vegetation
// 3 = Bareland

var LST_Water_2004 = lst2004.updateMask(classified.eq(0));
var LST_Builtup_2004 = lst2004.updateMask(classified.eq(1));
var LST_Vegetation_2004 = lst2004.updateMask(classified.eq(2));
var LST_Bareland_2004 = lst2004.updateMask(classified.eq(3));

// ==============================
// DISPLAY MAPS
// ==============================

Map.addLayer(
  LST_Water_2004,
  {min:20, max:45, palette:['blue','cyan']},
  'LST Waterbody 2004'
);

Map.addLayer(
  LST_Builtup_2004,
  {min:25, max:50, palette:['yellow','orange','red']},
  'LST Built-up 2004'
);

Map.addLayer(
  LST_Vegetation_2004,
  {min:20, max:40, palette:['green','yellow']},
  'LST Vegetation 2004'
);

Map.addLayer(
  LST_Bareland_2004,
  {min:25, max:48, palette:['brown','orange','red']},
  'LST Bareland 2004'
);

// ==============================
// MEAN LST PER CLASS
// ==============================

function meanLST(image, className) {
  return image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: AOI,
    scale: 30,
    maxPixels: 1e13
  }).get('LST');
}

var meanTable2004 = ee.Feature(null, {
  Year: 2004,
  Waterbody: meanLST(LST_Water_2004),
  Builtup: meanLST(LST_Builtup_2004),
  Vegetation: meanLST(LST_Vegetation_2004),
  Bareland: meanLST(LST_Bareland_2004)
});

print('Mean LST per LULC class 2004:', meanTable2004);

// ==============================
// EXPORT MEAN LST TABLE
// ==============================

//Export.table.toDrive({
  //collection: ee.FeatureCollection([meanTable2004]),
  //description: 'Kaduna_Mean_LST_LULC_2004',
  //folder: 'GEE_Exports',
  //fileNamePrefix: 'Kaduna_Mean_LST_LULC_2004',
  //fileFormat: 'CSV'
//});

// EXPORTS
// ==============================

Export.image.toDrive({
  image: LST_Water_2004,
  description: 'Kaduna_LST_Waterbody_2004',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Waterbody_2004',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Builtup_2004,
  description: 'Kaduna_LST_Builtup_2004',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Builtup_2004',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Vegetation_2004,
  description: 'Kaduna_LST_Vegetation_2004',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Vegetation_2004',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: LST_Bareland_2004,
  description: 'Kaduna_LST_Bareland_2004',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_LST_Bareland_2004',
  region: AOI,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
