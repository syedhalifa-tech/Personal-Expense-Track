const expenseForm = document.getElementById("expenseForm");
const expenseList = document.getElementById("expenseList");
const expenseId = document.getElementById("expenseId");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");
const totalSpent = document.getElementById("totalSpent");
const expenseCount = document.getElementById("expenseCount");
const formMessage = document.getElementById("formMessage");
const summaryList = document.getElementById("summaryList");
const emptyState = document.getElementById("emptyState");
const resetBtn = document.getElementById("resetBtn");
const submitBtn = document.getElementById("submitBtn");
const categoryFilter = document.getElementById("categoryFilter");

let expenses = [];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function setMessage(text, isError = false) {
  formMessage.textContent = text;
  formMessage.style.color = isError ? "#fb7185" : "#94a3b8";
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clearForm() {
  expenseId.value = "";
  expenseForm.reset();
  dateInput.valueAsDate = new Date();
  submitBtn.textContent = "Save expense";
  setMessage("");
}

function applyFilter(list) {
  const filter = categoryFilter.value.trim().toLowerCase();
  if (!filter) {
    return list;
  }

  return list.filter((expense) => expense.category.toLowerCase().includes(filter));
}

function renderSummary() {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const byCategory = expenses.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + item.amount;
    return result;
  }, {});

  totalSpent.textContent = currency.format(total);
  expenseCount.textContent = `${expenses.length} entr${expenses.length === 1 ? "y" : "ies"}`;

  const summaryItems = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  summaryList.innerHTML = summaryItems.length
    ? summaryItems
        .map(
          ([category, amount]) => `
            <div class="summary-item">
              <span>${category}</span>
              <strong>${currency.format(amount)}</strong>
            </div>
          `
        )
        .join("")
    : `<p class="empty-state">No summary yet. Add a few expenses to see category totals.</p>`;
}

function renderExpenses() {
  const visible = applyFilter(expenses);

  expenseList.innerHTML = visible.length
    ? visible
        .map(
          (expense) => `
            <tr>
              <td>${expense.title}</td>
              <td>${expense.category}</td>
              <td>${formatDate(expense.date)}</td>
              <td>${currency.format(expense.amount)}</td>
              <td>${expense.note || "-"}</td>
              <td>
                <div class="row-actions">
                  <button class="action-btn edit-btn" data-edit="${expense._id}">Edit</button>
                  <button class="action-btn delete-btn" data-delete="${expense._id}">Delete</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : "";

  emptyState.style.display = visible.length ? "none" : "block";
  renderSummary();
}

async function loadExpenses() {
  const response = await fetch("/api/expenses");
  expenses = await response.json();
  renderExpenses();
}

async function saveExpense(event) {
  event.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    amount: amountInput.value,
    category: categoryInput.value.trim(),
    date: dateInput.value,
    note: noteInput.value.trim(),
  };

  const method = expenseId.value ? "PUT" : "POST";
  const endpoint = expenseId.value ? `/api/expenses/${expenseId.value}` : "/api/expenses";

  let response;
  let result;

  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    result = await response.json();
  } catch (_error) {
    setMessage("Could not reach the server.", true);
    return;
  }

  if (!response.ok) {
    setMessage(result.message || "Something went wrong.", true);
    return;
  }

  setMessage(expenseId.value ? "Expense updated successfully." : "Expense saved successfully.");
  clearForm();
  await loadExpenses();
}

async function handleTableClick(event) {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const expense = expenses.find((item) => item._id === editId);
    if (!expense) {
      return;
    }

    expenseId.value = expense._id;
    titleInput.value = expense.title;
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    dateInput.value = new Date(expense.date).toISOString().slice(0, 10);
    noteInput.value = expense.note || "";
    submitBtn.textContent = "Update expense";
    setMessage("Editing an existing expense.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (deleteId) {
    let response;
    let result;

    try {
      response = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
      result = await response.json();
    } catch (_error) {
      setMessage("Could not reach the server.", true);
      return;
    }

    if (!response.ok) {
      setMessage(result.message || "Could not delete expense.", true);
      return;
    }

    setMessage("Expense deleted.");
    await loadExpenses();
  }
}

expenseForm.addEventListener("submit", saveExpense);
expenseList.addEventListener("click", handleTableClick);
resetBtn.addEventListener("click", clearForm);
categoryFilter.addEventListener("input", renderExpenses);

dateInput.valueAsDate = new Date();
loadExpenses().catch(() => {
  setMessage("Unable to load expenses. Check the server and MongoDB connection.", true);
});
