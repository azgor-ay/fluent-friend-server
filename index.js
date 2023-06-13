const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const app = express()
const cors= require("cors")
require("dotenv").config()
const port = process.env.PORT || 5000; 

// middleware 
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@fluent-friends-cluster.yutyvxi.mongodb.net/?retryWrites=true&w=majority`;

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
    const classesCollection = client.db('Fluent-Friends-DB').collection('Classes')
    const instructorsCollection = client.db('Fluent-Friends-DB').collection('Instructors')

    app.get('/classes', async(req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)
    })

    app.get('/instructors', async(req, res) => {
      const result = await instructorsCollection.find().toArray()
      res.send(result)
    })

    // 
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('server')
})
app.listen(port)