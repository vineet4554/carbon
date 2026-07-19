// Root server proxy for Render monorepo deployment
const path = require('path');
process.chdir(path.join(__dirname, 'backend'));
require('./backend/server.js');
