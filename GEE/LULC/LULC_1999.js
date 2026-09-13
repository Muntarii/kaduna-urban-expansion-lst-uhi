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

var bands = [
  'SR_B1','SR_B2','SR_B3',
  'SR_B4','SR_B5','SR_B7'
];

var input = image1999.select(bands);

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

Map.addLayer(
  classified,
  {
    min: 0,
    max: 3,
    palette: ['blue', 'red', 'green', 'yellow']
  },
  'Kaduna LULC 1999'
);

Export.table.toDrive({
  collection: accuracyFC,
  description: 'Kaduna_Accuracy_1999',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Kaduna_Accuracy_1999',
  fileFormat: 'CSV'
});
