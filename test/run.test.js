const PistonPress = require('../build');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs-extra');

let press;
beforeAll(async done => {
  press = await PistonPress.initializePrinter({
    templatesDirectory: path.join(__dirname, '/views'),
    assetsDirectory: path.join(__dirname, '/assets')
  });

  done();
});

test('test printing press', async () => {
  const { pdf } = await press.printTemplate('test-template.html', {
    name: 'world'
  });

  const pdfData = await pdfParse(pdf);

  console.log(pdfData);

  expect(pdfData.numpages).toBe(1);
  expect(pdfData.info.Creator).toBe('Chromium');

  // TODO: This test doesn't check actual rendering (e.g. fonts and image)
  expect(pdfData.text).toBe(' Hello, world. Piston Press \n\n');

  // await fs.writeFile('./snapshot.pdf', pdf);
});

afterAll(async done => {
  await press.close();
  done();
});
