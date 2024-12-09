const express = require('express');
const morgan = require('morgan');
const app = express();
const port = 8080;

app.use(morgan('combined'))

app.get('/', (req, res) => {
    res.send("Hello mymusic!");
});

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})