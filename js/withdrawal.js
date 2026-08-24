// Handles withdrawal requests and history

const withdrawalForm = document.getElementById("withdrawal-form");
const withdrawalHistoryList = document.getElementById("withdrawal-history-list");
const balanceSubtitle = document.getElementById("balance-subtitle");

let currentBalance = 0;

function loadBalance(user) {
  Promise.all([
    db.collection("contributions").where("userId", "==", user.uid).get(),
    db.collection("withdrawals").where("userId", "==", user.uid).where("status", "in", ["Pending", "Approved"]).get()
  ]).then(function (results) {
    const contribSnap = results[0];
    const withdrawSnap = results[1];

    let total = 0;
    contribSnap.forEach(function (doc) {
      total += doc.data().amount;
    });

    let withdrawn = 0;
    withdrawSnap.forEach(function (doc) {
      withdrawn += doc.data().amount;
    });

    currentBalance = total - withdrawn;
    balanceSubtitle.textContent = "Available balance: ₦" + currentBalance.toLocaleString();
  }).catch(function (error) {
    balanceSubtitle.textContent = "Could not load balance.";
  });
}

if (withdrawalForm) {
  withdrawalForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const amount = Number(document.getElementById("w-amount").value);
    const bankName = document.getElementById("w-bank-name").value;
    const accountName = document.getElementById("w-account-name").value;
    const accountNumber = document.getElementById("w-account-number").value;
    const reason = document.getElementById("w-reason").value;
    const message = document.getElementById("withdrawal-message");

    if (!amount || amount <= 0) {
      message.textContent = "Please enter a valid withdrawal amount.";
      message.style.color = "#B00020";
      return;
    }

    if (amount > currentBalance) {
      message.textContent = "Withdrawal amount exceeds your available balance.";
      message.style.color = "#B00020";
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      message.textContent = "You must be logged in.";
      message.style.color = "#B00020";
      return;
    }

    message.textContent = "Submitting your request...";
    message.style.color = "#555";

    db.collection("withdrawals").add({
      userId: user.uid,
      amount: amount,
      bankName: bankName,
      accountName: accountName,
      accountNumber: accountNumber,
      reason: reason,
      status: "Pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      message.textContent = "Withdrawal request submitted! Status: Pending.";
      message.style.color = "#0B4D2C";
      withdrawalForm.reset();
      loadWithdrawalHistory(user);
      loadBalance(user);
    }).catch(function (error) {
      message.textContent = error.message;
      message.style.color = "#B00020";
    });
  });
}

function loadWithdrawalHistory(user) {
  if (!withdrawalHistoryList) return;

  withdrawalHistoryList.innerHTML = "<p class='empty-text'>Loading...</p>";

  db.collection("withdrawals")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) {
        withdrawalHistoryList.innerHTML = "<p class='empty-text'>No withdrawal requests yet.</p>";
        return;
      }

      withdrawalHistoryList.innerHTML = "";
      snapshot.forEach(function (doc) {
        const data = doc.data();
        const row = document.createElement("div");
        row.className = "history-row";
        row.innerHTML =
          "<div><strong>" + data.bankName + "</strong><br><span class='history-sub'>" + data.accountNumber + "</span></div>" +
          "<div class='history-amount'>₦" + data.amount.toLocaleString() + "<br><span class='history-status'>" + data.status + "</span></div>";
        withdrawalHistoryList.appendChild(row);
      });
    })
    .catch(function (error) {
      withdrawalHistoryList.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });
}

auth.onAuthStateChanged(function (user) {
  if (user && withdrawalHistoryList) {
    loadBalance(user);
    loadWithdrawalHistory(user);
  }
});
