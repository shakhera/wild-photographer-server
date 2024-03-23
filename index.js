const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster7.gvmlsqj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster7`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function varifyJWT(req, res, next) {
  // console.log(req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const serviceCollection = client.db("photographerDB").collection("service");
    const ReviewCollection = client.db("photographerDB").collection("reviews");
    const TestimonialCollection = client
      .db("photographerDB")
      .collection("testimonial");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // service related api
    app.get("/services", async (req, res) => {
      let limit = parseInt(req.query.limit) || 3; // Default limit to 3 if not provided in query params
      const cursor = serviceCollection.find();

      if (limit !== -1) {
        // -1 represents loading all services
        const services = await cursor.limit(limit).toArray();
        res.send({ services });
      } else {
        const services = await cursor.toArray();
        const count = await serviceCollection.estimatedDocumentCount();
        res.send({ count, services });
      }
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // review related api
    app.get("/reviews", varifyJWT, async (req, res) => {
      // console.log(req.query.email);
      const decoded = req.decoded;
      console.log("in my review", decoded);
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "forbidden-access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await ReviewCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ReviewCollection.findOne(query);
      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await ReviewCollection.insertOne(review);
      res.send(result);
    });
    app.put("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const review = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateReview = {
        $set: {
          message: review.message,
          rating: review.rating,
        },
      };
      const result = await ReviewCollection.updateOne(
        filter,
        updateReview,
        options
      );
      res.send(result);
    });
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ReviewCollection.deleteOne(query);
      res.send(result);
    });

    //testimonial related api
    app.get("/testimonial", async (req, res) => {
      const result = await TestimonialCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
