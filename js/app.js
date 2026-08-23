// Loads real totals and recent contributions on the dashboard

const balanceAmountEl = document.getElementById("balance-amount");
const totalContributionsEl = document.getElementById("total-contributions");
const recentListEl = document.getElementById("recent-list");

function loadDashboardData(user) {
  if (!balanceAmountEl || !recentListEl) return;

  db.collection("contributions")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get()
    .then(function (snapshot) {
      let total = 0;
      const recentDocs = [];

      snapshot.forEach(function (doc) {
        const data = doc.data();
        total += data.amount;
        if (recentDocs.length < 3) {
          recentDocs.push(data);
        }
      });

      balanceAmountEl.textContent = "₦" + total.toLocaleString() + ".00";
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
    })
    .catch(function (error) {
      recentListEl.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadDashboardData(user);
  }
});
