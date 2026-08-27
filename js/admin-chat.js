// Handles the admin-side of one support conversation

function getThreadUserId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
}

const targetUid = getThreadUserId();
const adminChatList = document.getElementById("admin-chat-list");
const adminChatForm = document.getElementById("admin-chat-form");
const chatWithLabel = document.getElementById("chat-with-label");

function loadAdminChat() {
  if (!adminChatList || !targetUid) {
    if (adminChatList) adminChatList.innerHTML = "<p class='empty-text'>No conversation selected.</p>";
    return;
  }

  db.collection("supportThreads").doc(targetUid).get().then(function (doc) {
    if (doc.exists) {
      chatWithLabel.textContent = "Chat with: " + (doc.data().userName || targetUid);
    }
  });

  db.collection("supportMessages")
    .where("userId", "==", targetUid)
    .orderBy("createdAt", "asc")
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) {
        adminChatList.innerHTML = "<p class='empty-text'>No messages yet.</p>";
        return;
      }

      adminChatList.innerHTML = "";
      snapshot.forEach(function (doc) {
        const data = doc.data();
        const bubble = document.createElement("div");
        bubble.className = data.senderRole === "admin" ? "chat-bubble chat-bubble-admin" : "chat-bubble chat-bubble-user";
        bubble.textContent = data.message;
        adminChatList.appendChild(bubble);
      });

      adminChatList.scrollTop = adminChatList.scrollHeight;
    })
    .catch(function (error) {
      adminChatList.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });

  db.collection("supportThreads").doc(targetUid).set({
    unreadByAdmin: false
  }, { merge: true });
}

if (adminChatForm) {
  adminChatForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const input = document.getElementById("admin-chat-input");
    const text = input.value.trim();
    if (!text || !targetUid) return;

    db.collection("supportMessages").add({
      userId: targetUid,
      senderRole: "admin",
      message: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      return db.collection("supportThreads").doc(targetUid).set({
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unreadByUser: true
      }, { merge: true });
    }).then(function () {
      input.value = "";
      loadAdminChat();
    });
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    loadAdminChat();
  } else {
    window.location.href = "login.html";
  }
});
