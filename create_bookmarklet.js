// Script to create the minified bookmarklet using terser
const fs = require('fs');
const terser = require('terser');

const code = fs.readFileSync('bookmarklet_source.js', 'utf8');

// Use terser for professional minification
terser.minify(code, {
  compress: {
    dead_code: true,
    drop_console: false,
    drop_debugger: true,
    keep_classnames: false,
    keep_fargs: false,
    keep_fnames: false,
    keep_infinity: false
  },
  mangle: {
    toplevel: true
  },
  format: {
    comments: false,
    beautify: false
  }
}).then(result => {
  if (result.error) {
    console.error('Minification error:', result.error);
    process.exit(1);
  }
  
  // Wrap in javascript: prefix for bookmarklet
  const bookmarklet = `javascript:${result.code}`;

  // Guard the Chrome percent-decoding trap (see 01_readme.md): bookmarklets are
  // javascript: URLs, so a "%" immediately followed by two hex digits (e.g. a minified
  // "i%50" modulo) gets URL-decoded and corrupts the code. Refuse to emit a broken file.
  const percentEncodingHazards = bookmarklet.match(/%[0-9A-Fa-f]{2}/g);
  if (percentEncodingHazards) {
    console.error('Percent-encoding hazard(s) Chrome would decode:', percentEncodingHazards);
    process.exit(1);
  }

  fs.writeFileSync('bookmarklet_minified.txt', bookmarklet);
  console.log('Bookmarklet created successfully!');
  console.log('Length:', bookmarklet.length);
  console.log('Saved to: bookmarklet_minified.txt');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
