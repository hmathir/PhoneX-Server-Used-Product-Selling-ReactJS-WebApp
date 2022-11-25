const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
const productsCollections = client.db('phoneX').collection('productsCollections');
const usersCollections = client.db('phoneX').collection('usersCollections');

//Fetch All Category
app.get('/categories', async (req, res) => {
    const cursor = categoryCollections.find({});
    const category = await cursor.toArray();
    res.send(category);
})

app.get('/category/:id', async (req, res) => {
    const id = req.params.id;
    const category = await categoryCollections.findOne({ _id: ObjectId(id) });

    const filter = { category: category.categoryName, status: {$ne : "Paid"} };
    const result = await productsCollections.find(filter).toArray();
    res.send(result);
});


app.post('/products', async (req, res) => {
    const product = req.body;
    product.status = "Available";
    const result = await productsCollections.insertOne(product);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'Product Created Successfully'
        })
    }
    else {
        res.send({
            success: false,
            message: 'Product Not Created'
        })
    }
});

app.post('/users', async (req, res) => {
    const user = req.body;

    if (user.role === 'admin') {
        return res.status(403).send({
            success: false,
            message: 'User Not Created'
        })
    }

    user.verified = false;
    const result = await usersCollections.insertOne(user);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'User Created Successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'User Not Created'
        })
    }
});

app.get('/user', async (req, res) => {
    const email = req.query.email;
    const result = await usersCollections.findOne({ email: email });
    if (result) {
        result.name = result.firstName + ' ' + result.lastName;
    }
    res.send(result);
});


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})