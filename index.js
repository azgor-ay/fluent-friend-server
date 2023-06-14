const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
var jwt = require('jsonwebtoken');

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@fluent-friends-cluster.yutyvxi.mongodb.net/?retryWrites=true&w=majority`;

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
    const classesCollection = client
      .db("Fluent-Friends-DB")
      .collection("Classes");

    const usersCollection = client.db("Fluent-Friends-DB").collection("users");

    const instructorsCollection = client
      .db("Fluent-Friends-DB")
      .collection("Instructors");

    const selectedClassesCollection = client
      .db("Fluent-Friends-DB")
      .collection("selectedClasses");

    // Basic Apis
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // students dashboard related apis
    app.post("/selectedClasses", async (req, res) => {
      const selectedOne = req.body;
      const result = await selectedClassesCollection.insertOne(selectedOne);
      res.send(result);
    });

    app.get("/selectedClasses", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/selectedClasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.deleteOne(query);
      res.send(result);
    });

    // Admin works apis
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "existing user" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/student/:id', async(req, res) => {
      const id = req.params.id; 
      const filter = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: "student"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/users/instructor/:id', async(req, res) => {
      const id = req.params.id; 
      const filter = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: "instructor"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id; 
      const filter = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server");
});
app.listen(port);
