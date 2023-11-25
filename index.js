const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express();
const ports = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


//mongoDB

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8p2aqm7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("ContestDB").collection("users");
    const contestCollection = client.db("ContestDB").collection("contests");


    //routes
  

    

    //contests api
    app.post('/contests', async (req, res) => {
        const item = req.body;
        const result = await contestCollection.insertOne(item);
        res.send(result);
      });

    //user api

    app.get('/users',  async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });


    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Contest-Hub Server Started");
});

// check server api health

app.get("/health", (req, res) => {
  res.send("Contest-Hub is running....");
});

//error Handle for post, get

app.all("*", (req, res, next) => {
  const error = new Error(`Can't find ${req.originalUrl} on the server`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

app.listen(ports, () => {
  console.log(`server running on port ${ports}`);
});
