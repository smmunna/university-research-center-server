const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


//For using the MongoDB Cloud (online)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvrwrto.mongodb.net/?retryWrites=true&w=majority`;

// For Running Locally
// const uri = "mongodb://127.0.0.1:27017";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7) [Before Hosting , we should delete this line]
        // await client.connect();

        const database = client.db("researchDB");
        const usersCollection = database.collection("users");
        const allpapersCollection = database.collection("allpapers");

        // Write down all of your routes
        // -----------------------------------------------------------------------------------------------------------------


        // Pagination for all Papers;

        app.get('/totalProducts', async (req, res) => {
            const result = await allpapersCollection.estimatedDocumentCount();
            res.send({ totalProducts: result })
        })

        app.get('/products', async (req, res) => {
            console.log(req.query)
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 5;
            const skip = page * limit;
            const result = await allpapersCollection.find().skip(skip).limit(limit).toArray()
            res.send(result)
        })


        // End of Pagination

        // Update Specific user data;
        app.patch('/user', async (req, res) => {
            const filter = { email: req.body.email }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    phone: req.body.phone,
                    birthday: req.body.birthday,
                    address1: req.body.address1,
                    address2: req.body.address2,
                    bio: req.body.bio,
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Get one specific user based on the email;
        app.get('/user', async (req, res) => {
            const query = { email: req.query.email };
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        // creating new user;
        app.post('/users', async (req, res) => {
            const users = req.body
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        // Getting the single paper by id;
        app.get('/allpapers/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allpapersCollection.findOne(query)
            res.send([result])
        })

        // Getting all the papers;
        app.get('/allpapers', async (req, res) => {
            const result = await allpapersCollection.find().toArray()
            res.send(result)
        })




        // -----------------------------------------------------------------------------------------------------------------
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error (Removed this portion for solving the error)
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from Our Research Center')
})
app.get('*', (req, res) => {
    res.send('No routes Found')
})


app.listen(port, () => console.log('> Server is up and running on port : ' + port))