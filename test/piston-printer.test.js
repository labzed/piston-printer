const { initializePrinter } = require('../build');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs-extra');

let printer;
beforeAll(async done => {
  printer = await initializePrinter({
    templatesDirectory: path.join(__dirname, '/views'),
    assetsDirectory: path.join(__dirname, '/assets'),
    templateExtension: 'hbs'
  });

  done();
});

test('printTemplate', async done => {
  const { pdf } = await printer.printTemplate('test-template', {
    name: 'world'
  });

  const pdfData = await pdfParse(pdf);

  expect(pdfData.numpages).toBe(1);
  expect(pdfData.info.Creator).toBe('Chromium');

  // TODO: This test doesn't check actual rendering (e.g. fonts and image)
  expect(pdfData.text).toBe(' Hello, world. Piston Press \n\n');

  await fs.writeFile('./snapshot.pdf', pdf);

  done();
});

test('printTemplate with missing asset without allowFailedRequests', async done => {
  expect.assertions(1);

  try {
    await printer.printTemplate('test-template-missing-image');
  } catch (error) {
    expect(error).toEqual({
      name: 'AssetNotFound',
      message: '/assets/missing-image.png'
    });
    done();
  }
});

test('printTemplate with missing asset and allowFailedRequests', async done => {
  expect.assertions(1);

  const { pdf } = await printer.printTemplate(
    'test-template-missing-image',
    undefined,
    undefined,
    {
      allowFailedRequests: true
    }
  );

  expect(pdf).toBeInstanceOf(Buffer);

  done();
});

afterAll(async done => {
  await printer.close();
  done();
});
