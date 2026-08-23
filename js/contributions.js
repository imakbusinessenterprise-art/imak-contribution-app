// Handles plan selection, saving contributions to Firestore, and showing history

const planGrid = document.getElementById("plan-select-grid");
const selectedPlanText = document.getElementById("selected-plan-text");
const contributionForm = document.getElementById("contribution-form");
const historyList = document.getElementById("history-list");

let selectedPlan = null;
let selectedMin = 0;

function attachPlanButtonEvents() {
  document.querySelectorAll(".plan-option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".plan-option").forEach(function (b) {
        b.classList.remove("plan-option-selected");
      });
      btn.classList.add("plan-option-selected");

      selectedPlan = btn.getAttribute("data-plan");
      selectedMin = Number(btn.getAttribute("data-min"));
      selectedPlanText.textContent = "Selected plan: " + selectedPlan + " (minimum ₦" + selectedMin.toLocaleString() + ")";
    });
  });
}

function loadPlans() {
  if (!planGrid) return;

  db.collection("plans").get().then(function (snapshot) {
    if (snapshot.empty) {
      planGrid.innerHTML = "<p class='empty-text'>No plans configured yet. Contact admin.</p>";
      return;
    }

    planGrid.innerHTML = "";
    snapshot.forEach(function (doc) {
      const data = doc.data();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plan-option";
      btn.setAttribute("data-plan", data.name);
      btn.setAttribute("data-min", data.minimumAmount);
      btn.innerHTML =
        "<span class='plan-option-name'>" + data.name + "</span>" +
        "<span class='plan-option-min'>Min ₦" + data.minimumAmount.toLocaleString() + "</span>";
      planGrid.appendChild(btn);
    });

    attachPlanButtonEvents();
  }).catch(function (error) {
    planGrid.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
  });
}

loadPlans();

if (contributionForm) {
  contributionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const amountInput = document.getElementById("amount");
    const amount = Number(amountInput.value);
    const message = document.getElementById("contribution-message");

    if (!selectedPlan) {
      message.textContent = "Please select a contribution plan.";
      message.style.color = "#B00020";
      return;
    }

    if (!amount || amount <= 0) {
      message.textContent = "Please enter a valid amount.";
      message.style.color = "#B00020";
      return;
    }

    if (amount < selectedMin) {
      message.textContent = "Amount is below the minimum of ₦" + selectedMin.toLocaleString() + " for " + selectedPlan + ".";
      message.style.color = "#B00020";
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      message.textContent = "You must be logged in.";
      message.style.color = "#B00020";
      return;
    }

    message.textContent = "Saving your contribution...";
    message.style.color = "#555";

    db.collection("contributions").add({
      userId: user.uid,
      planType: selectedPlan,
      amount: amount,
      status: "Pending",
      transactionReference: "DEMO-" + Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function (docRef) {
      message.textContent = "Contribution saved! Redirecting to payment...";
      message.style.color = "#0B4D2C";
      window.location.href = "payment.html?id=" + docRef.id;
    }).catch(function (error) {
      message.textContent = error.message;
      message.style.color = "#B00020";
    });
  });
}

function loadHistory() {
  if (!historyList) return;
  const user = auth.currentUser;
  if (!user) return;

  historyList.innerHTML = "<p class='empty-text'>Loading...</p>";

  db.collection("contributions")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) {
        historyList.innerHTML = "<p class='empty-text'>No contributions yet.</p>";
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(function (doc) {
        const data = doc.data();
        const row = document.createElement("div");
        row.className = "history-row";
        row.innerHTML =
          "<div><strong>" + data.planType + "</strong><br><span class='history-sub'>" + data.transactionReference + "</span></div>" +
          "<div class='history-amount'>₦" + data.amount.toLocaleString() + "<br><span class='history-status'>" + data.status + "</span></div>";
        historyList.appendChild(row);
      });
    })
    .catch(function (error) {
      historyList.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });
}

auth.onAuthStateChanged(function (user) {
  if (user && historyList) {
    loadHistory();
  }
});
