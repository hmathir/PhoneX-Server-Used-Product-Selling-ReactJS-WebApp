const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion } = require('mongodb');

//cors
app.use(cors());
//bodyParser
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Server Running...')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dmmiwed.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const connectDB = async () => {
    try {
        await client.connect();
        console.log('Database Connected');
    } catch (e) {
        console.error(e);
    }
}
connectDB();

const categoryCollections = client.db('phoneX').collection('categoryCollections');

//Fetch All Category
app.get('/categories', async (req, res) => {
    const cursor = categoryCollections.find({});
    const category = await cursor.toArray();
    res.send(category);
})

app.get('/category/:id', async (req, res) => {
    const id = req.params.id;
    const category = await categoryCollections.findOne({ _id: ObjectId(id) });

    const filter = { category: category.name, status: {$ne : "Paid"} };
    const result = await products.find(filter).toArray();
    res.send(result);
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})