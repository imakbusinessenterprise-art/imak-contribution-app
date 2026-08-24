// Loads real totals and recent contributions on the dashboard

const balanceAmountEl = document.getElementById("balance-amount");
const totalContributionsEl = document.getElementById("total-contributions");
const recentListEl = document.getElementById("recent-list");

function loadDashboardData(user) {
  if (!balanceAmountEl || !recentListEl) return;

  Promise.all([
    db.collection("contributions").where("userId", "==", user.uid).orderBy("createdAt", "desc").get(),
    db.collection("withdrawals").where("userId", "==", user.uid).where("status", "in", ["Pending", "Approved"]).get()
  ]).then(function (results) {
    const contribSnap = results[0];
    const withdrawSnap = results[1];

    let total = 0;
    const recentDocs = [];

    contribSnap.forEach(function (doc) {
      const data = doc.data();
      total += data.amount;
      if (recentDocs.length < 3) {
        recentDocs.push(data);
      }
    });

    let withdrawn = 0;
    withdrawSnap.forEach(function (doc) {
      withdrawn += doc.data().amount;
    });

    const balance = total - withdrawn;

    balanceAmountEl.textContent = "₦" + balance.toLocaleString() + ".00";
    totalContributionsEl.textContent = "Total Contributions: ₦" + total.toLocaleString() + ".00";

    if (recentDocs.length === 0) {
      recentListEl.innerHTML = "<p class='empty-text'>No contributions yet.</p>";
      return;
    }

    recentListEl.innerHTML = "";
    recentDocs.forEach(function (data) {
      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        "<div><strong>" + data.planType + "</strong><br><span class='history-sub'>" + data.transactionReference + "</span></div>" +
        "<div class='history-amount'>₦" + data.amount.toLocaleString() + "<br><span class='history-status'>" + data.status + "</span></div>";
      recentListEl.appendChild(row);
    });
  }).catch(function (error) {
    recentListEl.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadDashboardData(user);
  }
});
