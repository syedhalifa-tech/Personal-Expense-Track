const express = require("express");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(__dirname, ".env"));

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB = process.env.MONGODB_DB || "expense_tracker";

let expensesCollection;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function toExpenseDocument(body) {
  const amount = Number(body.amount);
  const date = body.date ? new Date(body.date) : new Date();

  if (!body.title || !body.category || Number.isNaN(amount) || amount <= 0 || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    title: body.title.trim(),
    category: body.category.trim(),
    amount,
    note: (body.note || "").trim(),
    date,
    updatedAt: new Date(),
  };
}

app.get("/api/expenses", async (_request, response) => {
  const expenses = await expensesCollection
    .find({})
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  response.json(
    expenses.map((expense) => ({
      ...expense,
      _id: expense._id.toString(),
    }))
  );
});

app.get("/api/summary", async (_request, response) => {
  const expenses = await expensesCollection.find({}).toArray();

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = expenses.reduce((summary, expense) => {
    summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
    return summary;
  }, {});

  response.json({
    totalSpent,
    count: expenses.length,
    byCategory,
  });
});

app.post("/api/expenses", async (request, response) => {
  const document = toExpenseDocument(request.body);

  if (!document) {
    return response.status(400).json({ message: "Please provide a valid title, category, amount, and date." });
  }

  const createdAt = new Date();
  const result = await expensesCollection.insertOne({
    ...document,
    createdAt,
  });

  response.status(201).json({ _id: result.insertedId.toString(), ...document, createdAt });
});

app.put("/api/expenses/:id", async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ message: "Invalid expense id." });
  }

  const document = toExpenseDocument(request.body);
  if (!document) {
    return response.status(400).json({ message: "Please provide a valid title, category, amount, and date." });
  }

  const result = await expensesCollection.updateOne(
    { _id: new ObjectId(request.params.id) },
    { $set: document }
  );

  if (result.matchedCount === 0) {
    return response.status(404).json({ message: "Expense not found." });
  }

  response.json({ message: "Expense updated." });
});

app.delete("/api/expenses/:id", async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ message: "Invalid expense id." });
  }

  const result = await expensesCollection.deleteOne({ _id: new ObjectId(request.params.id) });

  if (result.deletedCount === 0) {
    return response.status(404).json({ message: "Expense not found." });
  }

  response.json({ message: "Expense deleted." });
});

async function startServer() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const database = client.db(MONGODB_DB);
    expensesCollection = database.collection("expenses");
  } catch (error) {
    if (error && error.code === "ECONNREFUSED") {
      console.error(
        `Unable to connect to MongoDB at ${MONGODB_URI}. Make sure MongoDB is running or your Atlas URI is reachable.`
      );
    }
    throw error;
  }

  app.listen(PORT, () => {
    console.log(`Expense tracker running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
