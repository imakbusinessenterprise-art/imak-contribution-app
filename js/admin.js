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
      "<button type='button' class='plan-card stat-clickable' id='stat-card-users'><p class='plan-name'>Total Users</p><p class='plan-amount' id='stat-users'>...</p></button>" +
      "<button type='button' class='plan-card stat-clickable' id='stat-card-contributions'><p class='plan-name'>Total Contributions</p><p class='plan-amount' id='stat-contributions'>...</p></button>" +
      "<button type='button' class='plan-card stat-clickable' id='stat-card-pending'><p class='plan-name'>Pending Withdrawals</p><p class='plan-amount' id='stat-pending'>...</p></button>" +
      "<button type='button' class='plan-card stat-clickable' id='stat-card-approved'><p class='plan-name'>Approved Withdrawals</p><p class='plan-amount' id='stat-approved'>...</p></button>" +
    "</div>" +
    "<div class='card' id='users-section'><h3>Registered Users</h3><div id='admin-users-list'><p class='empty-text'>Loading...</p></div></div>" +
    "<div class='card' id='contributions-section'><h3>All Contributions</h3><div id='admin-contributions-list'><p class='empty-text'>Loading...</p></div></div>" +
    "<div class='card'><h3>Payments Awaiting Confirmation</h3><div id='admin-payment-list'><p class='empty-text'>Loading...</p></div></div>" +
    "<div class='card' id='withdrawals-section'>" +
      "<h3>Withdrawal Requests</h3>" +
      "<p id='withdrawal-filter-label' class='empty-text' style='display:none;'>Showing: <span id='withdrawal-filter-name'></span> — <a href='#' id='withdrawal-clear-filter'>Show All</a></p>" +
      "<div id='admin-withdrawal-list'><p class='empty-text'>Loading...</p></div>" +
    "</div>" +
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
  loadPendingPayments();
  loadUsersList();
  loadAllContributions();

  document.getElementById("admin-logout-btn").addEventListener("click", function () {
    auth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });

  document.getElementById("stat-card-users").addEventListener("click", function () {
    document.getElementById("users-section").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("stat-card-contributions").addEventListener("click", function () {
    document.getElementById("contributions-section").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("stat-card-pending").addEventListener("click", function () {
    loadWithdrawalRequests("Pending");
    document.getElementById("withdrawals-section").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("stat-card-approved").addEventListener("click", function () {
    loadWithdrawalRequests("Approved");
    document.getElementById("withdrawals-section").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("withdrawal-clear-filter").addEventListener("click", function (event) {
    event.preventDefault();
    loadWithdrawalRequests();
  });
}

function loadStats() {
  db.collection("users").get().then(function (snapshot) {
    document.getElementById("stat-users").textContent = snapshot.size;
  });

  Promise.all([
    db.collection("contributions").get(),
    db.collection("withdrawals").where("status", "==", "Approved").get()
  ]).then(function (results) {
    const contribSnap = results[0];
    const approvedSnap = results[1];

    let total = 0;
    contribSnap.forEach(function (doc) {
      total += doc.data().amount;
    });

    let approvedWithdrawn = 0;
    approvedSnap.forEach(function (doc) {
      approvedWithdrawn += doc.data().amount;
    });

    document.getElementById("stat-contributions").textContent = "₦" + (total - approvedWithdrawn).toLocaleString();
  });

  db.collection("withdrawals").where("status", "==", "Pending").get().then(function (snapshot) {
    document.getElementById("stat-pending").textContent = snapshot.size;
  });

  db.collection("withdrawals").where("status", "==", "Approved").get().then(function (snapshot) {
    document.getElementById("stat-approved").textContent = snapshot.size;
  });
}

function loadWithdrawalRequests(filterStatus) {
  const listEl = document.getElementById("admin-withdrawal-list");
  const filterLabel = document.getElementById("withdrawal-filter-label");
  const filterName = document.getElementById("withdrawal-filter-name");

  if (filterStatus) {
    filterLabel.style.display = "block";
    filterName.textContent = filterStatus;
  } else {
    filterLabel.style.display = "none";
  }

  let query = db.collection("withdrawals").orderBy("createdAt", "desc");
  if (filterStatus) {
    query = db.collection("withdrawals").where("status", "==", filterStatus).orderBy("createdAt", "desc");
  }

  query.get().then(function (snapshot) {
    if (snapshot.empty) {
      listEl.innerHTML = "<p class='empty-text'>No withdrawal requests found.</p>";
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
          "<button class='btn-approve' data-id='" + doc.id + "' data-action='Approved' data-userid='" + data.userId + "' data-amount='" + data.amount + "'>Approve</button>" +
          "<button class='btn-reject' data-id='" + doc.id + "' data-action='Rejected' data-userid='" + data.userId + "' data-amount='" + data.amount + "'>Reject</button>";
      }

      row.innerHTML =
        "<p><strong>" + data.bankName + "</strong> — " + data.accountName + " (" + data.accountNumber + ")</p>" +
        "<p>Amount: ₦" + data.amount.toLocaleString() + " | Status: <strong>" + data.status + "</strong></p>" +
        "<div class='admin-btn-row'>" + buttons + "</div>";

      listEl.appendChild(row);
    });

    listEl.querySelectorAll(".btn-approve, .btn-reject").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const targetUserId = btn.getAttribute("data-userid");
        const amount = Number(btn.getAttribute("data-amount"));

        db.collection("withdrawals").doc(id).update({
          status: action,
          reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
          const notifMessage = action === "Approved"
            ? "Your withdrawal request of ₦" + amount.toLocaleString() + " has been approved."
            : "Your withdrawal request of ₦" + amount.toLocaleString() + " was rejected. Please contact admin.";

          return db.collection("notifications").add({
            userId: targetUserId,
            message: notifMessage,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(function () {
          loadWithdrawalRequests(filterStatus);
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

function loadPendingPayments() {
  const listEl = document.getElementById("admin-payment-list");

  db.collection("contributions").where("status", "==", "Awaiting Confirmation").get().then(function (snapshot) {
    if (snapshot.empty) {
      listEl.innerHTML = "<p class='empty-text'>No payments awaiting confirmation.</p>";
      return;
    }

    listEl.innerHTML = "";
    snapshot.forEach(function (doc) {
      const data = doc.data();
      const row = document.createElement("div");
      row.className = "admin-withdrawal-row";
      row.innerHTML =
        "<p><strong>" + data.planType + "</strong> — ₦" + data.amount.toLocaleString() + "</p>" +
        "<p>Reference: " + data.transactionReference + "</p>" +
        "<div class='admin-btn-row'>" +
          "<button class='btn-approve' data-id='" + doc.id + "' data-action='Successful' data-userid='" + data.userId + "' data-amount='" + data.amount + "' data-plantype='" + data.planType + "'>Confirm Paid</button>" +
          "<button class='btn-reject' data-id='" + doc.id + "' data-action='Rejected' data-userid='" + data.userId + "' data-amount='" + data.amount + "' data-plantype='" + data.planType + "'>Reject</button>" +
        "</div>";
      listEl.appendChild(row);
    });

    listEl.querySelectorAll(".btn-approve, .btn-reject").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const targetUserId = btn.getAttribute("data-userid");
        const amount = Number(btn.getAttribute("data-amount"));
        const planType = btn.getAttribute("data-plantype");

        db.collection("contributions").doc(id).update({
          status: action
        }).then(function () {
          const notifMessage = action === "Successful"
            ? "Your payment of ₦" + amount.toLocaleString() + " (" + planType + ") has been confirmed."
            : "Your payment of ₦" + amount.toLocaleString() + " (" + planType + ") was rejected. Please contact admin.";

          return db.collection("notifications").add({
            userId: targetUserId,
            message: notifMessage,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(function () {
          loadPendingPayments();
        });
      });
    });
  });
}

function loadUsersList() {
  const listEl = document.getElementById("admin-users-list");
  const currentUid = auth.currentUser ? auth.currentUser.uid : null;

  db.collection("users").orderBy("createdAt", "desc").get().then(function (snapshot) {
    if (snapshot.empty) {
      listEl.innerHTML = "<p class='empty-text'>No registered users yet.</p>";
      return;
    }

    listEl.innerHTML = "";

    snapshot.forEach(function (userDoc) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      const isCurrentAdmin = userData.role === "admin";

      let roleButton = "";
      if (uid === currentUid) {
        roleButton = "<span class='history-sub'>(this is you)</span>";
      } else if (isCurrentAdmin) {
        roleButton = "<button class='btn-reject' data-uid='" + uid + "' data-newrole='user'>Remove Admin</button>";
      } else {
        roleButton = "<button class='btn-approve' data-uid='" + uid + "' data-newrole='admin'>Make Admin</button>";
      }

      const row = document.createElement("div");
      row.className = "admin-withdrawal-row";
      row.innerHTML =
        "<p><strong>" + (userData.fullName || "(no name yet)") + "</strong> — " + (userData.role || "user") + "</p>" +
        "<p>" + (userData.email || "") + " | " + (userData.phone || "no phone") + "</p>" +
        "<p>Status: " + (userData.status || "active") + " | Activity: <span id='activity-" + uid + "'>loading...</span></p>" +
        "<div class='admin-btn-row'>" + roleButton + "</div>";
      listEl.appendChild(row);

      db.collection("contributions").where("userId", "==", uid).get().then(function (contribSnap) {
        let total = 0;
        contribSnap.forEach(function (c) {
          total += c.data().amount;
        });
        const activityEl = document.getElementById("activity-" + uid);
        if (activityEl) {
          activityEl.textContent = contribSnap.size + " contribution(s), ₦" + total.toLocaleString() + " total";
        }
      });
    });

    listEl.querySelectorAll("[data-newrole]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const uid = btn.getAttribute("data-uid");
        const newRole = btn.getAttribute("data-newrole");
        const confirmMsg = newRole === "admin"
          ? "Give this user admin access?"
          : "Remove admin access from this user?";

        if (!confirm(confirmMsg)) return;

        db.collection("users").doc(uid).update({ role: newRole }).then(function () {
          loadUsersList();
        }).catch(function (error) {
          alert(error.message);
        });
      });
    });
  }).catch(function (error) {
    listEl.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
  });
}

function loadAllContributions() {
  const listEl = document.getElementById("admin-contributions-list");

  db.collection("contributions").orderBy("createdAt", "desc").get().then(function (snapshot) {
    if (snapshot.empty) {
      listEl.innerHTML = "<p class='empty-text'>No contributions yet.</p>";
      return;
    }

    listEl.innerHTML = "";
    snapshot.forEach(function (doc) {
      const data = doc.data();
      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        "<div><strong>" + data.planType + "</strong><br><span class='history-sub'>" + data.transactionReference + "</span></div>" +
        "<div class='history-amount'>₦" + data.amount.toLocaleString() + "<br><span class='history-status'>" + data.status + "</span></div>";
      listEl.appendChild(row);
    });
  }).catch(function (error) {
    listEl.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadAdminDashboard(user);
  } else {
    window.location.href = "login.html";
  }
});
