// Real payment confirmation page — reads a contribution ID from the URL, shows bank details, and lets the user notify us they've paid

function getContributionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

const contributionId = getContributionId();
const paymentSummaryEl = document.getElementById("payment-summary");
const simulateBtn = document.getElementById("simulate-payment-btn");
const paymentMessageEl = document.getElementById("payment-message");

function loadPaymentDetails() {
  db.collection("paymentDetails").limit(1).get()
    .then(function (snapshot) {
      if (snapshot.empty) return;
      const data = snapshot.docs[0].data();
      document.getElementById("bank-name").textContent = data.bankName;
      document.getElementById("account-name").textContent = data.accountName;
      document.getElementById("account-number").textContent = data.accountNumber;
      document.getElementById("payment-instructions").textContent = data.instructions;
    })
    .catch(function (error) {
      console.log("Could not load payment details: " + error.message);
    });
}

function loadContribution() {
  if (!contributionId || !paymentSummaryEl) {
    if (paymentSummaryEl) {
      paymentSummaryEl.innerHTML = "<p class='empty-text'>No contribution selected.</p>";
    }
    return;
  }

  db.collection("contributions").doc(contributionId).get()
    .then(function (doc) {
      if (!doc.exists) {
        paymentSummaryEl.innerHTML = "<p class='empty-text'>Contribution not found.</p>";
        return;
      }
      const data = doc.data();
      paymentSummaryEl.innerHTML =
        "<h3>Payment Summary</h3>" +
        "<p class='bank-detail'><strong>Plan:</strong> " + data.planType + "</p>" +
        "<p class='bank-detail'><strong>Amount:</strong> ₦" + data.amount.toLocaleString() + "</p>" +
        "<p class='bank-detail'><strong>Reference:</strong> " + data.transactionReference + "</p>" +
        "<p class='bank-detail'><strong>Status:</strong> <span id='payment-status'>" + data.status + "</span></p>";

      if (data.status === "Successful") {
        simulateBtn.disabled = true;
        simulateBtn.textContent = "Payment Confirmed";
      } else if (data.status === "Awaiting Confirmation") {
        simulateBtn.disabled = true;
        simulateBtn.textContent = "Awaiting Confirmation";
      } else if (data.status === "Rejected") {
        simulateBtn.disabled = true;
        simulateBtn.textContent = "Payment Rejected — Contact Admin";
      }
    })
    .catch(function (error) {
      paymentSummaryEl.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });
}

if (simulateBtn) {
  simulateBtn.addEventListener("click", function () {
    if (!contributionId) return;

    simulateBtn.disabled = true;
    paymentMessageEl.textContent = "Notifying us of your payment...";
    paymentMessageEl.style.color = "#555";

    db.collection("contributions").doc(contributionId).update({
      status: "Awaiting Confirmation"
    }).then(function () {
      paymentMessageEl.textContent = "Thanks! We'll confirm your payment shortly once we've checked our account.";
      paymentMessageEl.style.color = "#0B4D2C";
      simulateBtn.textContent = "Awaiting Confirmation";
      loadContribution();
    }).catch(function (error) {
      paymentMessageEl.textContent = error.message;
      paymentMessageEl.style.color = "#B00020";
      simulateBtn.disabled = false;
    });
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadContribution();
    loadPaymentDetails();
  }
});
