// Build script for the Nag Neutralizer bookmarklet: minifies
// nag_neutralizer_bookmarklet_source.js with terser and writes
// nag_neutralizer_bookmarklet_minified.txt with the javascript: prefix.
// Same pattern and safety guard as create_bookmarklet.js (the chat exporter).
const fs = require('fs');
const terser = require('terser');

const nag_neutralizer_readable_source_code = fs.readFileSync('nag_neutralizer_bookmarklet_source.js', 'utf8');

terser.minify(nag_neutralizer_readable_source_code, {
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
}).then(minification_result => {
  if (minification_result.error) {
    console.error('Minification error:', minification_result.error);
    process.exit(1);
  }

  const nag_neutralizer_bookmarklet_url = `javascript:${minification_result.code}`;

  // Guard the Chrome percent-decoding trap (see 01_readme.md): a "%" immediately
  // followed by two hex digits in a javascript: URL gets URL-decoded by the browser
  // and silently corrupts the code. Refuse to emit a broken file.
  const percent_encoding_hazard_matches = nag_neutralizer_bookmarklet_url.match(/%[0-9A-Fa-f]{2}/g);
  if (percent_encoding_hazard_matches) {
    console.error('Percent-encoding hazard(s) Chrome would decode:', percent_encoding_hazard_matches);
    process.exit(1);
  }

  fs.writeFileSync('nag_neutralizer_bookmarklet_minified.txt', nag_neutralizer_bookmarklet_url);
  console.log('Nag Neutralizer bookmarklet created successfully!');
  console.log('Length:', nag_neutralizer_bookmarklet_url.length);
  console.log('Saved to: nag_neutralizer_bookmarklet_minified.txt');
}).catch(build_error => {
  console.error('Error:', build_error);
  process.exit(1);
});
