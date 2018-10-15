const { initializePrinter } = require('../build');

test('initializePrinter with missing options', () => {
  expect.assertions(1);
  expect(initializePrinter()).rejects.toThrow(
    'Missing options for intializePrinter'
  );
});

test('initializePrinter with missing options', () => {
  expect.assertions(1);
  expect(initializePrinter({})).rejects.toThrow(
    'Missing option for initializePrinter: assetsDirectory'
  );
});

test('initializePrinter with missing assetsDirectory', () => {
  expect.assertions(1);
  expect(
    initializePrinter({ templatesDirectory: './templates' })
  ).rejects.toThrow('Missing option for initializePrinter: assetsDirectory');
});

test('initializePrinter with missing templatesDirectory', () => {
  expect.assertions(1);
  expect(initializePrinter({ assetsDirectory: './templates' })).rejects.toThrow(
    'Missing option for initializePrinter: templatesDirectory'
  );
});
