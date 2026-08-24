// Handles the notification bell — unread badge, panel, mark-as-read

const notifBellBtn = document.getElementById("notif-bell-btn");
const notifBadge = document.getElementById("notif-badge");
const notifPanel = document.getElementById("notif-panel");
const notifList = document.getElementById("notif-list");

let notifCurrentUser = null;

function loadNotifications() {
  if (!notifBellBtn || !notifCurrentUser) return;

  db.collection("notifications")
    .where("userId", "==", notifCurrentUser.uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get()
    .then(function (snapshot) {
      notifList.innerHTML = "";
      let unreadCount = 0;

      if (snapshot.empty) {
        notifList.innerHTML = "<p class='empty-text'>No notifications yet.</p>";
      }

      snapshot.forEach(function (doc) {
        const data = doc.data();
        if (!data.read) unreadCount++;

        const row = document.createElement("div");
        row.className = "notif-row" + (data.read ? "" : " notif-unread");
        row.innerHTML = "<p>" + data.message + "</p>";
        row.addEventListener("click", function () {
          if (!data.read) {
            db.collection("notifications").doc(doc.id).update({ read: true }).then(function () {
              loadNotifications();
            });
          }
        });
        notifList.appendChild(row);
      });

      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = "inline-block";
      } else {
        notifBadge.style.display = "none";
      }
    })
    .catch(function (error) {
      notifList.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });
}

if (notifBellBtn) {
  notifBellBtn.addEventListener("click", function () {
    notifPanel.style.display = notifPanel.style.display === "none" ? "block" : "none";
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    notifCurrentUser = user;
    loadNotifications();
  }
});
