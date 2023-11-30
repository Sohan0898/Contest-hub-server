const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const ports = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//mongoDB

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
    const participateCollection = client
      .db("ContestDB")
      .collection("participates");

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // use verify admin after verifyToken
    const verifyCreator = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isCreator = user?.role === "creator";
      if (!isCreator) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //routes

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.send({ token });
    });

    //user api

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //for admin

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //for creator
    app.get("/users/creator/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let creator = false;
      if (user) {
        creator = user?.role === "creator";
      }
      res.send({ creator });
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

    //uodate user role
    app.patch("/users/updateRole/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      const user = await userCollection.findOne(filter);
      console.log(user);

      if (result.modifiedCount > 0) {
        res.status(200).json({
          message: `"${user.name
            .split(/\s+/)
            .slice(0, 1)
            .join(" ")}" is now ${role}.`,
        });
      } else {
        res.status(404).json({ message: "User not found." });
      }
    });

    //update user info
    app.patch("/users/:id", async (req, res) => {
      const user = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...user,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //participates api

    app.get("/participates", async (req, res) => {
      const { email } = req.query;

      const query = {};

      if (email) {
        query.$or = [{ creatorEmail: email }, { participateEmail: email }];
      }

      const result = await participateCollection.find(query).toArray();

      console.log(result);
      res.send(result);
    });

    app.patch("/participates/winner/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "winner",
        },
      };
      const result = await participateCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/participates", async (req, res) => {
      const item = req.body;
      const result = await participateCollection.insertOne(item);
      res.send(result);
    });

    //contests api

    app.get("/contests", async (req, res) => {
      const { email } = req.query;
      const query = email ? { email } : {};
      const result = await contestCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    //sereach contest in banner api

    app.get("/contests/search", async (req, res) => {
      const { query } = req.query;

      try {
        const contests = await contestCollection
          .find({ tag: { $regex: new RegExp(query, "i") } })
          .project({ name: 1, image: 1 })
          .toArray();

        res.json(contests);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/contests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.findOne(query);
      res.send(result);
    });

    app.post("/contests", async (req, res) => {
      const item = req.body;
      const result = await contestCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/contests/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await contestCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/contests/:id", async (req, res) => {
      const items = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: items.name,
          image: items.image,
          price: items.price,
          prize: items.prize,
          tag: items.tag,
          date: items.date,
          description: items.description,
          task: items.task,
        },
      };

      const result = await contestCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/Contests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(query);
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
