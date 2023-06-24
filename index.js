const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
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

// --------------------------------------------------------------------------------------------
// Verify User with Jwt token;
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization
    // console.log(authorization)
    if (!authorization) {
        return res.send({ error: 'Error occured', message: "You can not access this." })
    }
    const token = authorization.split(' ')[1]
    // console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
            return res.send({ error: 'Error occured', message: "You can not access this." })
        }
        req.decode = decode
        next()
    })
}

// -------------------------------------- ----- -------------------------------------------- -------

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7) [Before Hosting , we should delete this line]
        // await client.connect();

        const database = client.db("researchDB");
        const usersCollection = database.collection("users");
        const savesCollection = database.collection("saves");
        const allpapersCollection = database.collection("allpapers");

        // Write down all of your routes
        // -----------------------------------------------------------------------------------------------------------------

        // -------------------------------
        // Jwt procedure for signin token;
        app.post('/jwt', async (req, res) => {
            const user = req.body.email;
            const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })

        })
        // -------------------------------

        // Delete save item
        app.delete('/saveitems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await savesCollection.deleteOne(query)
            res.send(result)
        })

        // get saves items
        app.get('/saveitems', async (req, res) => {
            const query = { user_email: req.query.email }
            const result = await savesCollection.find(query).toArray()
            res.send(result)
        })
        // Saves Collection from user;
        app.post('/saveitems', async (req, res) => {
            const items = req.body;
            const result = await savesCollection.insertOne(items)
            res.send(result)
        })


        // Search Papers;
        // Search by name
        app.get('/searchpaper', async (req, res) => {
            const searchQuery = req.query.title
            const regexPattern = new RegExp(searchQuery, 'i')
            const result = await allpapersCollection.find({ title: regexPattern }).toArray()
            res.send(result)
        })

        // Getting the recent papers;
        app.get('/recentpaper', async (req, res) => {
            const result = await allpapersCollection.find().sort({ published_date: -1 }).toArray()
            res.send(result)
        })

        // Getting the Data Categorywise;
        app.get('/category', async (req, res) => {
            const query = { category: req.query.category }
            if (req.query.category == 'all') {
                const result = await allpapersCollection.find().toArray()
                res.send(result)
            }
            else {
                const result = await allpapersCollection.find(query).toArray()
                res.send(result)
            }
        })


        // Pagination for all Papers;

        app.get('/totalProducts', async (req, res) => {
            const result = await allpapersCollection.estimatedDocumentCount();
            res.send({ totalProducts: result })
        })

        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 5;
            const skip = page * limit;
            const result = await allpapersCollection.find().skip(skip).limit(limit).toArray()
            res.send(result)
        })


        // End of Pagination



        // Calculating total User;
        app.get('/totalUsers', async (req, res) => {
            const result = await usersCollection.estimatedDocumentCount()
            res.send({ totalUser: result })
        })

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
        app.get('/user', verifyJWT, async (req, res) => {
            // Verifying the loggedin user
            const decode = req.decode
            if (decode.user !== req.query.email) {
                res.status(403).send("Unauthorized access")
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }

            const result = await usersCollection.findOne(query)
            res.send(result)
        })

        // Delete Users
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)

        })

        // Change users Role;
        app.patch('/users', async (req, res) => {
            const filter = { email: req.body.emails }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    status: req.body.userstatus,
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Find all the users
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        // creating new user;
        app.post('/users', async (req, res) => {
            const users = req.body
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        // Unpublished to published a Paper ;
        app.patch('/allpapers/unpublished/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    status: 'published',
                },
            };

            const result = await allpapersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Getting all unpublished paper;
        app.get('/allpapers/unpublished', async (req, res) => {
            const query = { status: 'unpublished' }
            const result = await allpapersCollection.find(query).toArray()
            res.send(result)
        })

        // Getting the single paper by id;
        app.get('/allpapers/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allpapersCollection.findOne(query)
            res.send([result])
        })

        // Submit Paper by Students;
        app.post('/allpapers', async (req, res) => {
            const papersInfo = req.body
            const result = await allpapersCollection.insertOne(papersInfo)
            res.send(result)
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