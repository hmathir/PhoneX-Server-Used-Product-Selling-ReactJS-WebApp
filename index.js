const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

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
const paymentsCollection = client.db('phoneX').collection('paymentsCollection');
const reportsCollections = client.db('phoneX').collection('reportsCollections');
const blogCollections = client.db('phoneX').collection('blogCollections');



//JWT
//create jwt  
app.get('/jwt', (req, res) => {
    const email = req.query.email;
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET);
    res.send({ token: token });
});


//verify jwt 
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers.authorization;
    if (!bearerHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.email = decoded.email;
        next();
    });

};

// admin verify token
const verifyAdmin = async (req, res, next) => {
    const email = req.email;
    const result = await usersCollections.findOne({ email: email });
    if (result.role !== "admin") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};

// verify seller 
const verifySeller = async (req, res, next) => {
    const email = req.email;
    const result = await usersCollections.findOne({ email: email });
    if (result.role !== "seller") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};

// verify buyer 
const verifyBuyer = async (req, res, next) => {
    const email = req.email;
    const result = await usersCollections.findOne({ email: email });
    if (result.role !== "buyer") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};

//Fetch All Category
app.get('/categories', async (req, res) => {
    const cursor = categoryCollections.find({});
    const category = await cursor.toArray();
    res.send(category);
})

app.get('/category/:id', async (req, res) => {
    const id = req.params.id;
    const category = await categoryCollections.findOne({ _id: ObjectId(id) });

    const filter = { category: category.categoryName, status: { $ne: "Paid" } };
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

app.get('/bookings/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await productsCollections.findOne(filter);
    res.send(result);
})

app.post('/booking', async (req, res) => {
    const id = req.query.id;
    const details = req.body;
    console.log(details);
    const filter = { _id: ObjectId(id) };
    const option = { upsert: true };
    const update = {
        $set: details
    };
    const result = await productsCollections.updateOne(filter, update, option);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Item Booked'
        })
    }
    else {
        res.send({
            success: false,
            message: 'Something Wrong...'
        })
    }
})

app.post('/create-payment-intent', async (req, res) => {
    const booking = req.body;
    const price = booking.price;
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
            "card"
        ]
    });
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

app.post('/payments', async (req, res) => {
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    const id = payment.bookingId
    const filter = { _id: ObjectId(id) }
    const updatedDoc = {
        $set: {
            status: "Paid",
            transactionId: payment.transactionId
        }
    }
    const updatedResult = await productsCollections.updateOne(filter, updatedDoc);
    res.send(result);
})






app.get('/my-orders', verifyToken, verifyBuyer, async (req, res) => {
    const email = req.query.email;
    if (email !== req.email) {
        return res.send({
            success: false,
            message: 'Unauthorized Access'
        })
    }
    const filter = { buyerEmail : email };
    const result = await productsCollections.find(filter).toArray();
    res.send(result);
})


//Users
app.get('/user', async (req, res) => {
    const email = req.query.email;
    const result = await usersCollections.findOne({ email: email });
    if (result) {
        result.name = result.firstName;
    }
    res.send(result);
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

//Get all users by role.
app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    const filter = { role: req.query.role };
    const result = await usersCollections.find(filter).toArray();
    res.send(result);
})

//Delete a signle user.
app.delete('/users', verifyToken,verifyAdmin, async (req, res) => {
    const email = req.query.email;
    const result = await usersCollections.deleteOne({ email: email });
    if (result.deletedCount) {
        res.send({
            success: true,
            message: 'User Deleted'
        })
    } else {
        res.send({
            success: false,
            message: 'Ups! Something Wrong'
        })
    }
});

//Create User using Google OAuth.
app.post('/google', async (req, res) => {
    const user = req.body;

    if (user.role === 'admin') {
        return res.status(403).send({
            success: false,
            message: 'User Not Created'
        })
    }
    const alreadyExist = await usersCollections.findOne({ email: user.email });
    if (alreadyExist) {
        return res.send({
            success: true,
            message: 'Successfully Logged In'
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


//Products
//get true products
app.get('/sponsoderdProducts', async (req, res) => {
    let filter = { status: { $ne: "Paid" }, ads: true };
    const result = await productsCollections.find(filter).toArray();
    res.send(result);
});


//update User Photo
app.put('/upload-profile', async (req, res) => {
    const email = req.query.email;
    const profile = req.query.profile;
    const update = { $set: { profile: profile } };
    const option = { upsert: true };
    const result = await usersCollections.updateOne({ email: email }, update, option);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Profile Updated'
        })
    } else {
        res.send({
            success: false,
            message: 'Upps! Something Wrong'
        })
    }
})


//Create reports here
app.post('/report', async (req, res) => {
    const report = req.body;

    if (!report.reporterName) {
        res.send({
            success: false,
            message: 'Please Login...'
        })
    }

    const alreadyReported = await reportsCollections.findOne({ productId: report.productId });
    if (alreadyReported) {
        return res.send({
            success: false,
            message: 'already Reported'
        })
    }
    const result = await reportsCollections.insertOne(report);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'Report Sent Successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Report Not Sent'
        })
    }
})
//Get All Reports Here
app.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
    const result = await reportsCollections.find({}).toArray();
    res.send(result);
});


//Delete Reported Product
app.delete('/reports', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.query.id;
    let success;

    if (id) {
        const result = await productsCollections.deleteOne({ _id: ObjectId(id) });
        if (result.deletedCount) {
            success = true;
        }
    }
    if (req.query.reportId) {
        const result2 = await reportsCollections.deleteOne({ _id: ObjectId(req.query.reportId) });
        if (result2.deletedCount) {
            success = true;
        }
    }
    if (success) {
        res.send({
            success: true,
            message: 'Deleted Successfully'
        })
    }
    else {
        res.send({
            success: false,
            message: 'Not Deleted'
        })
    }

})


// verify seller
app.patch('/seller-verify', verifyToken, verifyAdmin, async (req, res) => {
    const email = req.query.email;
    const update = { $set: { verified: true } };
    const result = await usersCollections.updateOne({ email: email }, update);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Congrass! Seller Verified!'
        })
    } else {
        res.send({
            success: false,
            message: 'Ups! Something Wrong'
        })
    }
})

//My-Products
app.get('/my-products', verifyToken, verifySeller,  async (req, res) => {
    const email = req.query.email;
    if (email !== req.email) {
        return res.send({
            success: false,
            message: 'Unauthorized Access'
        })
    }
    const result = await productsCollections.find({ sellerEmail: email }).toArray();
    res.send(result);
});

//Update Sponsored Status
app.patch('/run-ad',  async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const update = { $set: { ads: true } };
    const result = await productsCollections.updateOne(filter, update);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Ad Run Successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Ups! Something Wrong',
        })
    }
});

// seller delete product 
app.delete('/products', async (req, res) => {
    const id = req.query.id;
    const result = await productsCollections.deleteOne({ _id: ObjectId(id) });
    if (result.deletedCount) {
        res.send({
            success: true,
            message: 'Deleted Successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Ups! Something Wrong'
        })
    }
});

//get blogs
app.get('/blogs', async (req, res) => {
    const result = await blogCollections.find({}).toArray();
    res.send(result);
});


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})