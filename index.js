const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 4000;


//cors
app.use(cors());
//bodyParser
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Server Running...')
})


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})