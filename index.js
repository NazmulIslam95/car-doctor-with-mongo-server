const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: 'https://car-doctor-fdee9.web.app',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ww6tl6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// custom middleware
const logger = async (req, res, next) => {
    console.log('log:info', req.method, req.originalUrl);
    next();
};

const headers = {
    'Access-Control-Allow-Origin': 'https://car-doctor-fdee9.web.app',
    'Access-Control-Allow-Credentials': 'true',
};

const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Access Denied' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Access Denied' });
        }

        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('car-doctor').collection('services');
        const bookingCollection = client.db('car-doctor').collection('bookings');

        // auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '24h',
            });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                })
                .send({ success: true });
        });

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('Logging Out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true });
        });

        // serviceCollection related operations start
        app.get('/services', logger, async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const result = await serviceCollection.find().toArray();
            res.send(result);
        });

        app.get('/services/:id', logger, async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await serviceCollection.findOne(query);
            res.send(result);
        });
        // serviceCollection related operations end

        // bookingCollection related operations start
        app.get('/bookings', logger, verifyToken, async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const query = {};
            if (req.query?.email) {
                query.email = req.query.email;
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.patch('/bookings/:id', async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            const updateDoc = {
                $set: {
                    status: updatedBooking.status,
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/bookings/:id', async (req, res) => {
            // Set CORS headers here
            res.set(headers);

            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        });
        // bookingCollection related operations end

        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Car-Doctor Server Is Running');
});

app.listen(port, () => {
    console.log(`Car Doctor Server Is Running on Port ${port}`);
});
