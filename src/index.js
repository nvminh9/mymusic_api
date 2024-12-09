const express = require('express');
const app = express();
const port = 8080;
const morgan = require('morgan');
const route = require('./routes');

// Log all request
app.use(morgan('combined'))

// Route Init
route(app);

// Test
app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})