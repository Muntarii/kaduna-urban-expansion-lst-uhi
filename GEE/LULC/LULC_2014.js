// ==============================
// LANDSAT 8 – LULC 2014 (KADUNA)
// ==============================

var Landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
  .filterDate('2014-01-01', '2014-12-30')
  .filterMetadata('CLOUD_COVER', 'less_than', 5)
  .filterBounds(AOI)
  .median()
  .clip(AOI);

var vis_par = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000,
  gamma: 1.4
};

Map.centerObject(AOI, 10);
Map.addLayer(Landsat8, vis_par, 'Landsat 8 Composite 2014');

var label = 'Class';

var bands = [
  'B1','B2','B3','B4','B5','B7','B8','B9','B10','B11'
];

var input = Landsat8.select(bands);

var training = Vegetation
  .merge(Bareland)
  .merge(Waterbody)
  .merge(builtup);

print('Training features:', training);

var samples = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});

print('Samples:', samples);

var withRandom = samples.randomColumn('random');

var trainSet = withRandom.filter(ee.Filter.lt('random', 0.8));
var testSet  = withRandom.filter(ee.Filter.gte('random', 0.8));

var classifier = ee.Classifier.smileCart()
  .train({
    features: trainSet,
    classProperty: label,
    inputProperties: bands
  });

var classified = input.classify(classifier);

Map.addLayer(
  classified,
  {
    min: 0,
    max: 3,
    palette: ['blue', 'red', 'green', 'lightgreen']
  },
  'Kaduna LULC 2014'
);

var validated = testSet.classify(classifier);

var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error Matrix 2014:', errorMatrix);
print('Overall Accuracy 2014:', errorMatrix.accuracy());
print('Kappa 2014:', errorMatrix.kappa());

var accuracyTable = ee.Feature(null, {
  Year: 2014,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});
