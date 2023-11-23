const express = require('express');
const cors = require('cors');

const app = express();
const ports = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// routes


app.get('/', (req, res) => {
res.send('Contest-Hub Server Started');
});

app.listen(ports, () => {
console.log( `server running on port ${ports}`);
});