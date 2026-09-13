var L7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
  .filterBounds(AOI)
  .filterDate('2004-01-01', '2004-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 5));

print('Landsat 7 image count:', L7.size());

var image2004 = L7.median().clip(AOI);

function scaleL7(img) {
  var optical = img.select(
    ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7']
  ).multiply(0.0000275).add(-0.2);

  return img.addBands(optical, null, true);
}

image2004 = scaleL7(image2004);

Map.centerObject(AOI, 9);

Map.addLayer(
  image2004,
  {bands:['SR_B3','SR_B2','SR_B1'], min:0, max:0.3},
  'Landsat 7 – 2004'
);

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

var samples = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});

var withRandom = samples.randomColumn('random');

var trainSet = withRandom.filter(ee.Filter.lt('random', 0.8));
var testSet  = withRandom.filter(ee.Filter.gte('random', 0.8));

var classifier = ee.Classifier.smileRandomForest(200)
  .train({
    features: trainSet,
    classProperty: label,
    inputProperties: bands
  });

var classified = input.classify(classifier);

var validated = testSet.classify(classifier);

var errorMatrix = validated.errorMatrix(label, 'classification');

print('Error Matrix 2004:', errorMatrix);
print('Overall Accuracy 2004:', errorMatrix.accuracy());
print('Kappa 2004:', errorMatrix.kappa());

Map.addLayer(
  classified,
  {
    min: 0,
    max: 3,
    palette: ['blue', 'red', 'green', 'yellow']
  },
  'Kaduna LULC 2004'
);

var accuracyTable = ee.Feature(null, {
  Year: 2004,
  Overall_Accuracy: errorMatrix.accuracy(),
  Kappa: errorMatrix.kappa(),
  Error_Matrix: errorMatrix.array().toString()
});
