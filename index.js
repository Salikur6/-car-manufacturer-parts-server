const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectID } = require('bson');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_KEY);

app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddhai.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



const jwtVerify = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: 'UnAuthorize Access' });
    }
    const token = authHeader.split(' ')[1];

    console.log(authHeader)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        console.log(decoded)
        next();
    });


}


async function run() {
    try {

        await client.connect();
        const itemsCollection = client.db('parts_manufacturer').collection('items');
        const orderCollection = client.db('parts_manufacturer').collection('order');
        const paymentCollection = client.db('parts_manufacturer').collection('payment');
        const reviewCollection = client.db('parts_manufacturer').collection('reviews');
        const userCollection = client.db('parts_manufacturer').collection('users');


        //payment intent

        app.post('/create-payment-intent', jwtVerify, async (req, res) => {
            const { totalPrice } = req.body;
            const amount = totalPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        //ItemCollection's items all products get API
        app.get('/items', jwtVerify, async (req, res) => {
            const query = {};
            const result = await itemsCollection.find(query).toArray();
            res.send(result)
        })

        //reviewCollection review post api

        app.post('/review', async (req, res) => {
            const data = req.body;
            const result = await reviewCollection.insertOne(data);
            res.send(result);
        })

        //reviewCollection review post api

        app.get('/reviews', jwtVerify, async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.send(result);
        })


        //ItemCollection's items one products get API

        app.get('/item/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) }
            const result = await itemsCollection.findOne(query);
            // console.log(result)
            res.send(result)
        })



        //---------------------------------------

        // orderCollection post api 

        app.post('/order', async (req, res) => {
            const data = req.body;
            const result = await orderCollection.insertOne(data);
            res.send(result);
        })


        // orderCollection user order get api 

        app.get('/userorder', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            console.log('decoded', decodedEmail);
            if (email === decodedEmail) {
                const query = { email: email }

                const result = await orderCollection.find(query).toArray();
                // console.log(jwtVerify);
                return res.send(result)
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

        })

        // orderCollection  order get api by id

        app.get('/orderid/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })


        //orderCollection payment update api

        app.put('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectID(id) };
            console.log(payment)
            const updateDoc = {
                $set: {
                    paid: true,
                    transaction: payment.transaction
                },
            };

            // const result = await paymentCollection.insertOne(updateDoc)
            const updatePayment = await orderCollection.updateOne(filter, updateDoc)
            // console.log(updatePayment)
            res.send(updateDoc);
        })


        //orderCollection payment update api


        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectID(id) };
            const result = await orderCollection.deleteOne(filter);
            // console.log(result);
            res.send(result);
        })


        // -----------------

        // userCollection user put api

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const body = req.body;
            const filter = { email };
            const option = { upsert: true }
            const updateDoc = {
                $set: body
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            // console.log(result, token)
            res.send({ result, token });
        })



        // userCollection get user  api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })


        // userCollection update user  to admin  api
        app.put('/user/admin/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;

            const requaster = req.decoded.email;
            const reqAccount = await userCollection.findOne({ email: requaster })
            if (reqAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' }
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
        })


        // userCollection get user  admin api

        app.get('/admin/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await userCollection.findOne(filter);
            const isAdmin = user.role === 'admin';
            console.log(isAdmin)
            res.send({ admin: isAdmin })
        })







    }
    finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Everything is ok')
});


app.listen(port, () => {
    console.log('Listening port', port);
});