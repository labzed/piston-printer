<div style="text-align:center;"><img style="width:120px" src="piston.svg"></div>
<h1 style="text-align: center">Piston Printer</h1>

Piston Printer is a node.js module for printing HTML templates to PDF.

It uses:

- A headless Chromium process to render the HTML and print to a PDF
- [Puppeteer](https://github.com/GoogleChrome/puppeteer) to control the Chromium process
- A localhost-facing instance of Express to render the HTML based on templates

Express is used to render templates placed in the template directory and to provide access to local assets (stylesheets, images, etc) placed in an assets directory.

This makes it easy to use any template engine supported by Express, including template features like layouts/partials, and at the same time serve static files by just placing them in the assets directory.

## Example

```js
const PistonPrinter = require('piston-printer');

const printer = await PistonPrinter.initializePrinter({
    templatesDirectory: path.join(__dirname, '/templates'),
    assetsDirectory: path.join(__dirname, '/assets')
  });

const {pdf} = await printer.printTemplate('my-template.html');
```

## Usage

```ts
interface IPistonPrinter {
    printTemplate(
      templateName: string,
      values: object // template values, also known as locals
      options: IPrinterOptions // see options below
    )
}
```

## Template directories

Example directory structure:

- `assets/`
  ``
- `templates/`
  - `my-template.html`

The contents of the `assetsDirectory` will be available to the rendered template under the  `/assets/` prefix.

A file located at `{assetsDirectory}/style.css` will be available in the page as `/assets/style.css`.

## Print Options

```ts
interface IPrintOptions {
  width: string;
  height: string;
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  }
}
```

Values should contain a CSS unit like `px`, `pt`, `in`, or `cm`.

Example: `{width: '8.5in', height: '11in'}`

## License

MIT License

Logo credit: Piston icon by Eucalyp from the Noun Project.
