const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe= require('stripe')(process.env.STRIPE_KYE)
const port = process.env.PORT || 5000;

// middlwer

app.use(cors());
app.use(express.json())


// mongodb setap

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pyzkzxp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // collection

        const userscollection = client.db("Bistro").collection("users");
        const menucollection = client.db("Bistro").collection("Menu");
        const reviewscollection = client.db("Bistro").collection("Revios");
        const cartscollection = client.db("Bistro").collection("carts");

        // jwt releted api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCES_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        // medlware
        const verifiToken = (req, res, next) => {
            console.log('insaid verifid token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbiddin acces' })
            }

            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCES_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbiddin acces' })
                }
                req.decoded = decoded;
                next();
            })
        }
        const verifiyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userscollection.findOne(query)
            const isAdmin = user?.Rool === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden acces' })
            }
            next();
        }

        // userscollection api 
        app.get('/users', verifiToken, verifiyAdmin, async (req, res) => {
            const result = await userscollection.find().toArray();
            res.send(result)
        })
        app.get('/users/admin/:email', verifiToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unathoraze email' })
            }
            const query = { email: email }
            const user = await userscollection.findOne(query)
            console.log(user);
            let admin = false;
            if (user) {
                admin = user?.Rool === 'admin'
            }
            res.send({ admin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const exsitinguser = await userscollection.findOne(query)
            if (exsitinguser) {

                return res.send({ message: 'user allrady exsistting', insertedId: null })
            }
            const result = await userscollection.insertOne(user)
            res.send(result)
        })
        app.delete('/users/:id', verifiToken, verifiyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userscollection.deleteOne(query)
            res.send(result)
        })
        app.patch('/users/admin/:id', verifiToken, verifiyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    Rool: 'admin',
                }
            }
            const result = await userscollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // cartscollection
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartscollection.find(query).toArray();
            res.send(result)
        });


        app.post('/carts', async (req, res) => {
            const cartsitems = req.body;
            const result = await cartscollection.insertOne(cartsitems);
            res.send(result)
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartscollection.deleteOne(query);
            res.send(result)
        })

        // menucollection
        app.get('/menu', async (req, res) => {
            const result = await menucollection.find().toArray();
            res.send(result)
        })
        app.post('/menu',verifiToken,verifiyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menucollection.insertOne(item);
            res.send(result)
        })
        app.delete('/menu/:id',verifiToken,verifiyAdmin, async (req,res) => {
            const id=req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menucollection.deleteOne(query);
            res.send(result)
        })
        app.get('/menu/:id', async (req,res) => {
            const id=req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menucollection.findOne(query);
            res.send(result)
        })
        // reviewscollection
        app.get('/reviews', async (req, res) => {
            const result = await reviewscollection.find().toArray();
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('bostro boos raning')
})
app.listen(port, () => {
    console.log(`bistro boss server is coming ${port}`);
})