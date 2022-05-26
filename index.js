const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectID } = require('bson');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddhai.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        await client.connect();
        const itemsCollection = client.db('parts_manufacturer').collection('items');


        //ItemCollection's items all products get API
        app.get('/items', async (req, res) => {
            const query = {};
            const result = await itemsCollection.find(query).toArray();
            res.send(result)
        })


        //ItemCollection's items one products get API
        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) }
            const result = await itemsCollection.findOne(query);
            console.log(result)
            res.send(result)
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