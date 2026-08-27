// Handles the user-side support chat

const chatList = document.getElementById("chat-list");
const chatForm = document.getElementById("chat-form");
let supportUser = null;

function loadChat() {
  if (!chatList || !supportUser) return;

  db.collection("supportMessages")
    .where("userId", "==", supportUser.uid)
    .orderBy("createdAt", "asc")
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) {
        chatList.innerHTML = "<p class='empty-text'>No messages yet — say hello!</p>";
        return;
      }

      chatList.innerHTML = "";
      snapshot.forEach(function (doc) {
        const data = doc.data();
        const bubble = document.createElement("div");
        bubble.className = data.senderRole === "admin" ? "chat-bubble chat-bubble-admin" : "chat-bubble chat-bubble-user";
        bubble.textContent = data.message;
        chatList.appendChild(bubble);
      });

      chatList.scrollTop = chatList.scrollHeight;
    })
    .catch(function (error) {
      chatList.innerHTML = "<p class='empty-text'>" + error.message + "</p>";
    });

  db.collection("supportThreads").doc(supportUser.uid).set({
    unreadByUser: false
  }, { merge: true });
}

if (chatForm) {
  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !supportUser) return;

    db.collection("supportMessages").add({
      userId: supportUser.uid,
      senderRole: "user",
      message: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      return db.collection("supportThreads").doc(supportUser.uid).set({
        userName: supportUser.email,
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unreadByAdmin: true
      }, { merge: true });
    }).then(function () {
      input.value = "";
      loadChat();
    });
  });
}

auth.onAuthStateChanged(function (user) {
  if (user) {
    supportUser = user;
    loadChat();
  }
});
