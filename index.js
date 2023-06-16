const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

    const selectedClassesCollection = client
      .db("Fluent-Friends-DB")
      .collection("selectedClasses");

    const paymentCollection = client
      .db("Fluent-Friends-DB")
      .collection("payments");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send(token);
    });

    // Admin Verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // Instructor Verify
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // student Verify
    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "student") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // Basic Apis
    app.get("/classes", verifyJWT, async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/classes/approved", async (req, res) => {
      const filter = { status: "approved" };
      const result = await classesCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    app.delete(
      "/classes/:id",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await classesCollection.deleteOne(query);
        res.send(result);
      }
    );

    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/students", async (req, res) => {
      const query = { role: "student" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // students dashboard related apis
    app.post("/selectedClasses", verifyJWT, verifyStudent, async (req, res) => {
      const selectedOne = req.body;
      const result = await selectedClassesCollection.insertOne(selectedOne);
      res.send(result);
    });

    app.get("/selectedClasses", verifyJWT, verifyStudent, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/selectedClasses/:id", verifyJWT, verifyStudent, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.findOne(query);
      res.send(result);
    });

    app.delete("/selectedClasses/:id", verifyJWT, verifyStudent, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/enrolledOrPayments", verifyJWT, verifyStudent, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "existing user" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ student: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === "student" };
      res.send(result);
    });

    // ADMIN Works
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/classes/approved/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/classes/feedback/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const feedBack = req.body.feedback;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedBack,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/classes/denied/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/student/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "student",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // End of Admin Works

    // Payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Save payment to db
    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;

      // Delete From Selected Class
      const deleteQuery = { _id: new ObjectId(payment.idInSelectedClassDB) };
      const deleteFromSelected = await selectedClassesCollection.deleteOne(
        deleteQuery
      );

      // Remove 1 add 1 on students count
      const classFilter = { _id: new ObjectId(payment.enrolledClassId) };
      const classDoc = await classesCollection.findOne(classFilter);
      const currentAvailableSeats = classDoc.available_seats;
      const currentEnrolledStudents = classDoc.enrolled_students;

      // Calculate new values
      const updatedAvailableSeats = currentAvailableSeats - 1;
      const updatedEnrolledStudents = currentEnrolledStudents + 1;

      const updateDoc = {
        $set: {
          available_seats: updatedAvailableSeats,
          enrolled_students: updatedEnrolledStudents,
        },
      };
      const updateStudentCount = await classesCollection.updateOne(
        classFilter,
        updateDoc
      );

      const result = await paymentCollection.insertOne(payment);
      res.send({ result, deleteFromSelected, updateStudentCount });
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Fluent Friend Server- Final Assignment");
});
app.listen(port);
