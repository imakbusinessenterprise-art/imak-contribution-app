// Admin dashboard — only accessible to users with role "admin"

const adminContent = document.getElementById("admin-content");

function showAccessDenied() {
  adminContent.innerHTML = "<h2>Access Denied</h2><p class='subtitle'>You do not have permission to view this page.</p><a href='login.html' class='btn-primary'>Back to Login</a>";
}

function loadAdminDashboard(user) {
  db.collection("users").doc(user.uid).get().then(function (doc) {
    if (!doc.exists || doc.data().role !== "admin") {
      showAccessDenied();
      return;
    }

    buildDashboard();
  }).catch(function () {
    showAccessDenied();
  });
}

function buildDashboard() {
  adminContent.innerHTML =
    "<h2>Admin Dashboard</h2>" +
    "<div class='plan-grid' id='admin-stats'>" +
      "<div class='plan-card'><p class='plan-name'>Total Users</p><p class='plan-amount' id='stat-users'>...</p></div>" +
      "<div class='plan-card'><p class='plan-name'>Total Contributions</p><p class='plan-amount' id='stat-contributions'>...</p></div>" +
      "<div class='plan-card'><p class='plan-name'>Pending Withdrawals</p><p class='plan-amount' id='stat-pending'>...</p></div>" +
      "<div class='plan-card'><p class='plan-name'>Approved Withdrawals</p><p class='plan-amount' id='stat-approved'>...</p></div>" +
    "</div>" +
    "<div class='card'><h3>Withdrawal Requests</h3><div id='admin-withdrawal-list'><p class='empty-text'>Loading...</p></div></div>" +
    "<div class='card'>" +
      "<h3>Payment Details</h3>" +
      "<form id='payment-details-form'>" +
        "<label for='pd-bank-name'>Bank Name</label>" +
        "<input type='text' id='pd-bank-name' required>" +
        "<label for='pd-account-name'>Account Name</label>" +
        "<input type='text' id='pd-account-name' required>" +
        "<label for='pd-account-number'>Account Number</label>" +
        "<input type='text' id='pd-account-number' required>" +
        "<label for='pd-instructions'>Instructions</label>" +
        "<input type='text' id='pd-instructions'>" +
        "<p id='pd-message' class='form-message'></p>" +
        "<button type='submit' class='btn-primary'>Save Payment Details</button>" +
      "</form>" +
    "</div>" +
    "<div class='card'>" +
      "<h3>Manage Contribution Plans</h3>" +
      "<form id='plans-form'>" +
        "<label for='plan-daily-min'>Daily Plan — Minimum (₦)</label>" +
        "<input type='number' id='plan-daily-min' required>" +
        "<label for='plan-weekly-min'>Weekly Plan — Minimum (₦)</label>" +
        "<input type='number' id='plan-weekly-min' required>" +
        "<label for='plan-monthly-min'>Monthly Plan — Minimum (₦)</label>" +
        "<input type='number' id='plan-monthly-min' required>" +
        "<p id='plans-message' class='form-message'></p>" +
        "<button type='submit' class='btn-primary'>Save Plans</button>" +
      "</form>" +
    "</div>" +
    "<button id='admin-logout-btn' class='btn-secondary logout-space'>Logout</button>";

  loadStats();
  loadWithdrawalRequests();
  loadPaymentDetailsForm();
  loadPlansForm();

  document.getElementById("admin-logout-btn").addEventListener("click", function () {
    auth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });
}

function loadStats() {
  db.collection("users").get().then(function (snapshot) {
    document.getElementById("stat-users").textContent = snapshot.size;
  });

  db.collection("contributions").get().then(function (snapshot) {
    let total = 0;
    snapshot.forEach(function (doc) {
      total += doc.data().amount;
    });
    document.getElementById("stat-contributions").textContent = "₦" + total.toLocaleString();
  });

  db.collection("withdrawals").where("status", "==", "Pending").get().then(function (snapshot) {
    document.getElementById("stat-pending").textContent = snapshot.size;
  });

  db.collection("withdrawals").where("status", "==", "Approved").get().then(function (snapshot) {
    document.getElementById("stat-approved").textContent = snapshot.size;
  });
}

function loadWithdrawalRequests() {
  const listEl = document.getElementById("admin-withdrawal-list");

  db.collection("withdrawals").orderBy("createdAt", "desc").get().then(function (snapshot) {
    if (snapshot.empty) {
      listEl.innerHTML = "<p class='empty-text'>No withdrawal requests yet.</p>";
      return;
    }

    listEl.innerHTML = "";
    snapshot.forEach(function (doc) {
      const data = doc.data();
      const row = document.createElement("div");
      row.className = "admin-withdrawal-row";

      let buttons = "";
      if (data.status === "Pending") {
        buttons =
          "<button class='btn-approve' data-id='" + doc.id + "' data-action='Approved'>Approve</button>" +
          "<button class='btn-reject' data-id='" + doc.id + "' data-action='Rejected'>Reject</button>";
      }

      row.innerHTML =
        "<p><strong>" + data.bankName + "</strong> — " + data.accountName + " (" + data.accountNumber + ")</p>" +
        "<p>Amount: ₦" + data.amount.toLocaleString() + " | Status: <strong>" + data.status + "</strong></p>" +
        "<div class='admin-btn-row'>" + buttons + "</div>";

      listEl.appendChild(row);
    });

    document.querySelectorAll(".btn-approve, .btn-reject").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        db.collection("withdrawals").doc(id).update({
          status: action,
          reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
          loadWithdrawalRequests();
          loadStats();
        });
      });
    });
  });
}

let paymentDetailsDocId = null;

function loadPaymentDetailsForm() {
  db.collection("paymentDetails").limit(1).get().then(function (snapshot) {
    if (snapshot.empty) return;

    const docSnap = snapshot.docs[0];
    paymentDetailsDocId = docSnap.id;
    const data = docSnap.data();

    document.getElementById("pd-bank-name").value = data.bankName || "";
    document.getElementById("pd-account-name").value = data.accountName || "";
    document.getElementById("pd-account-number").value = data.accountNumber || "";
    document.getElementById("pd-instructions").value = data.instructions || "";
  });

  document.getElementById("payment-details-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const message = document.getElementById("pd-message");
    const bankName = document.getElementById("pd-bank-name").value;
    const accountName = document.getElementById("pd-account-name").value;
    const accountNumber = document.getElementById("pd-account-number").value;
    const instructions = document.getElementById("pd-instructions").value;

    message.textContent = "Saving...";
    message.style.color = "#555";

    const updateData = {
      bankName: bankName,
      accountName: accountName,
      accountNumber: accountNumber,
      instructions: instructions
    };

    let savePromise;
    if (paymentDetailsDocId) {
      savePromise = db.collection("paymentDetails").doc(paymentDetailsDocId).update(updateData);
    } else {
      savePromise = db.collection("paymentDetails").add(updateData);
    }

    savePromise.then(function () {
      message.textContent = "Payment details saved!";
      message.style.color = "#0B4D2C";
    }).catch(function (error) {
      message.textContent = error.message;
      message.style.color = "#B00020";
    });
  });
}

function loadPlansForm() {
  db.collection("plans").doc("daily").get().then(function (doc) {
    document.getElementById("plan-daily-min").value = doc.exists ? doc.data().minimumAmount : 500;
  });
  db.collection("plans").doc("weekly").get().then(function (doc) {
    document.getElementById("plan-weekly-min").value = doc.exists ? doc.data().minimumAmount : 2000;
  });
  db.collection("plans").doc("monthly").get().then(function (doc) {
    document.getElementById("plan-monthly-min").value = doc.exists ? doc.data().minimumAmount : 5000;
  });

  document.getElementById("plans-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const message = document.getElementById("plans-message");
    const dailyMin = Number(document.getElementById("plan-daily-min").value);
    const weeklyMin = Number(document.getElementById("plan-weekly-min").value);
    const monthlyMin = Number(document.getElementById("plan-monthly-min").value);

    message.textContent = "Saving...";
    message.style.color = "#555";

    Promise.all([
      db.collection("plans").doc("daily").set({ name: "Daily", frequency: "daily", minimumAmount: dailyMin, status: "active" }, { merge: true }),
      db.collection("plans").doc("weekly").set({ name: "Weekly", frequency: "weekly", minimumAmount: weeklyMin, status: "active" }, { merge: true }),
      db.collection("plans").doc("monthly").set({ name: "Monthly", frequency: "monthly", minimumAmount: monthlyMin, status: "active" }, { merge: true })
    ]).then(function () {
      message.textContent = "Plans saved!";
      message.style.color = "#0B4D2C";
    }).catch(function (error) {
      message.textContent = error.message;
      message.style.color = "#B00020";
    });
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadAdminDashboard(user);
  } else {
    window.location.href = "login.html";
  }
});
