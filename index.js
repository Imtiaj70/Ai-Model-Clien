require('dotenv').config();

const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let modelcollection;
let purchasecollection;

async function run() {
  try {
    await client.connect();
    const db = client.db('model-db');
    modelcollection = db.collection('models');
    purchasecollection = db.collection('purchases');

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run();

// Routes
app.get('/', (req, res) => res.send('Server is running!'));
app.get('/hello', (req, res) => res.send('How are you!'));

// Get all models
app.get('/models', async (req, res) => {
  try {
    const models = await modelcollection.find().toArray();
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get single model by ID
app.get('/models/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const model = await modelcollection.findOne({ _id: new ObjectId(id) });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(model);
  } catch (error) {
    console.error('Error fetching model by ID:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

// Create new model
app.post('/models', async (req, res) => {
  try {
    const modelData = req.body;
    modelData.purchased = modelData.purchased || 0; // default value
    const result = await modelcollection.insertOne(modelData);
    const newModel = await modelcollection.findOne({ _id: result.insertedId });
    res.status(201).json(newModel);
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

// Update model by ID
app.put('/models/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;
    const result = await modelcollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(result.value);
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// Delete model by ID
app.delete('/models/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await modelcollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// 🛒 Purchase model (increment purchased count + save purchase info)
app.post("/models/:id/purchase", async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { buyerEmail } = req.body || {};

    console.log("🛒 Purchase Request for:", id, "by", buyerEmail);

    const result = await modelcollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { purchased: 1 } },
      { returnDocument: "after" }
    );

    // if (!result.value) {
    //   console.log(result);
    //   return res.status(404).json({ message: "Model not found" });
    // }

    // Log purchase record
    await purchasecollection.insertOne({
      modelId: id,
      buyerEmail: buyerEmail || "guest@example.com",
      date: new Date(),
    });
    console.log(result);
    res.json({
      message: "Purchase successful",
      updatedModel: result.value,
    });
  } catch (err) {
    console.error("Error purchasing model:", err);
    res.status(500).json({ message: "Error purchasing model" });
  }
});

// 🧾 Get all purchases (for MyPurchases page)
app.get("/purchases", async (req, res) => {
  try {
    const purchases = await purchasecollection.find().toArray();
    res.json(purchases);
  } catch (err) {
    console.error("Error fetching purchases:", err);
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
});

app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
