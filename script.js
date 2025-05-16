document.addEventListener("DOMContentLoaded", function () {
  const chatbotContainer = document.getElementById("chatbot-container");
  const closeBtn = document.getElementById("close-btn");
  const clearBtn = document.getElementById("clear-btn");
  const endChatBtn = document.getElementById("end-chat-btn");
  const sendBtn = document.getElementById("send-btn");
  const chatBotInput = document.getElementById("chatbot-input");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatbotIcon = document.getElementById("chatbot-icon");
  const typingIndicator = document.getElementById("typing-indicator");

  let isFirstOpen = true;
  let conversationHistory = [];
  let idleTimeout;
  let idleMessageSent = false; // Track if idle message has been sent
  const MAX_RETRIES = 2;
  const sessionId = generateSessionId(); // Unique session ID for chat history

  chatbotIcon.addEventListener("click", async () => {
    chatbotContainer.classList.remove("hidden");
    chatbotIcon.style.display = "none";
    if (isFirstOpen) {
      displayWelcomeMessage();
      await loadChatHistory(); // Load previous chat history
      isFirstOpen = false;
    }
    resetIdleTimer();
  });

  closeBtn.addEventListener("click", confirmEndChat);
  endChatBtn.addEventListener("click", confirmEndChat);
  clearBtn.addEventListener("click", async () => {
    chatbotMessages.innerHTML = "";
    conversationHistory = [];
    idleMessageSent = false; // Reset idle message flag
    displayWelcomeMessage();
    await clearChatHistory(); // Clear chat history in MongoDB
    resetIdleTimer();
  });

  sendBtn.addEventListener("click", sendMessage);
  chatBotInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function saveChatMessage(role, text) {
    try {
      await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role,
          text,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  async function loadChatHistory() {
    try {
      const response = await fetch(`http://localhost:3000/api/chat/${sessionId}`);
      const messages = await response.json();
      if (Array.isArray(messages)) {
        messages.forEach((msg) => {
          appendMessage(msg.role, msg.text, false, new Date(msg.timestamp));
          conversationHistory.push({ role: msg.role, text: msg.text });
        });
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  async function clearChatHistory() {
    try {
      await fetch(`http://localhost:3000/api/chat/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }

  function resetIdleTimer() {
    clearTimeout(idleTimeout);
    idleMessageSent = false; // Reset idle message flag
    idleTimeout = setTimeout(() => {
      // Only send idle message if the last message was from the user
      if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === "user" && !idleMessageSent) {
        const idleMessage = "If you don't have any further questions, please click 'End Chat' to close this session.";
        appendMessage("bot", idleMessage);
        conversationHistory.push({ role: "bot", text: idleMessage });
        saveChatMessage("bot", idleMessage);
        idleMessageSent = true; // Prevent sending the idle message again
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  function confirmEndChat() {
    const shouldEnd = confirm("Are you sure you want to end the chat? Your conversation will be cleared.");
    if (shouldEnd) {
      chatbotContainer.classList.add("hidden");
      chatbotIcon.style.display = "flex";
      chatbotMessages.innerHTML = "";
      conversationHistory = [];
      isFirstOpen = true;
      idleMessageSent = false; // Reset idle message flag
      clearTimeout(idleTimeout);
      clearChatHistory();
    }
  }

  function displayWelcomeMessage() {
    const welcomeMessage = "Hi, I'm CRYPHIX BOT. How can I help you today?";
    appendMessage("bot", welcomeMessage, true);
    saveChatMessage("bot", welcomeMessage);
    appendQuickReplies([
      { text: "Encrypt Text", message: "How can I encrypt a text message?" },
{ text: "Decrypt File", message: "How do I decrypt an uploaded file?" },
{ text: "Supported Files", message: "What file types can I encrypt or decrypt?" },
{ text: "How It Works", message: "How does encryption and decryption work?" },
{ text: "Security Info", message: "Is my data secure when I use this app?" },
{ text: "Audio Encryption", message: "Can I encrypt audio files here?" },
{ text: "Image Decryption", message: "How do I decrypt an encrypted image?" },
{ text: "Mobile Access", message: "Can I use this app on my phone?" },
{ text: "Add Password", message: "How do I add password protection to encryption?" },
{ text: "Troubleshooting", message: "Why is my decryption not working?" }

    ]);
  }

  function appendQuickReplies(replies) {
    const replyContainer = document.createElement("div");
    replyContainer.classList.add("quick-replies");
    replies.forEach((reply) => {
      const button = document.createElement("button");
      button.textContent = reply.text;
      button.classList.add("quick-reply-btn");
      button.addEventListener("click", () => {
        appendMessage("user", reply.message);
        conversationHistory.push({ role: "user", text: reply.message });
        saveChatMessage("user", reply.message);
        getBotResponse(reply.message);
        replyContainer.remove();
        resetIdleTimer();
      });
      replyContainer.appendChild(button);
    });
    chatbotMessages.appendChild(replyContainer);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function sendMessage() {
    const userMessage = chatBotInput.value.trim();
    if (userMessage) {
      appendMessage("user", userMessage);
      conversationHistory.push({ role: "user", text: userMessage });
      saveChatMessage("user", userMessage);
      chatBotInput.value = "";
      getBotResponse(userMessage);
      resetIdleTimer();
    }
  }

  function appendMessage(sender, message, isWelcome = false, timestamp = new Date()) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    if (isWelcome) messageElement.classList.add("welcome-message");

    const textElement = document.createElement("div");
    textElement.classList.add("message-text");
    textElement.textContent = message;

    const timeElement = document.createElement("div");
    timeElement.classList.add("message-time");
    timeElement.textContent = timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageElement.appendChild(textElement);
    messageElement.appendChild(timeElement);
    chatbotMessages.appendChild(messageElement);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function getBotResponse(userMessage, retryCount = 0) {
    typingIndicator.classList.remove("hidden");
    const API_KEY = "AIzaSyDlk3x1Gpn9K-Wv48VICK__gy6B-1VUfOY";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const sanitizedMessage = userMessage.replace(/[<>]/g, "");
    const conversationContext = conversationHistory
      .slice(-6)
      .map((msg) => `${msg.role === "user" ? "Patient" : "Assistant"}: ${msg.text}`)
      .join("\n");

    const fullPrompt = `
Query: "hello" or "hi" or "hey"
Response: Hello, welcome to our cybersecurity platform. How can I assist with your encryption or decryption needs today?

Query: "how to encrypt" or "how does encryption work"
Response: You can encrypt text, images, or audio using our secure tools—just upload your file or enter your text. Would you like help getting started?

Query: "how to decrypt" or "decrypt file"
Response: Simply upload the encrypted file or input the ciphertext and provide the key if required. Would you like a guide on using our decryption tool?

Query: "supported file types" or "what files can I encrypt"
Response: We support text, JPEG/PNG images, and MP3/WAV audio for encryption and decryption. Would you like to upload a file now?

Query: "is it secure" or "how secure is this app"
Response: Our app uses industry-standard encryption algorithms to ensure strong data protection. Would you like technical details on our encryption methods?

Query: "can I use this for confidential data" or "is it private"
Response: Yes, your data is processed securely and never stored without your consent. Would you like to learn more about our privacy policy?

Query: "how to use the app" or "user guide"
Response: Our platform is user-friendly—just choose encrypt or decrypt, upload your file or input text, and follow prompts. Would you like a step-by-step tutorial?

Query: "what is encryption" or "encryption meaning"
Response: Encryption is a process that converts readable data into an unreadable format using a key. Would you like to explore how it applies to your files?

Query: "can I use it on mobile" or "mobile support"
Response: Yes, our web app is optimized for mobile devices. Would you like help accessing features on your phone?

Query: "how to share encrypted files"
Response: You can securely share encrypted files by exporting and sending the ciphertext and key separately. Would you like tips for secure sharing?

Query: "password protection" or "add password"
Response: You can add a password to your encryption for added security. Would you like to see how to set that up?

Query: "decryption failed" or "can’t decrypt"
Response: Decryption may fail due to an incorrect key or corrupted file. Would you like troubleshooting support?

Query: "is it free" or "cost of service"
Response: Our basic encryption and decryption tools are free to use. Would you like to explore any premium features?

Query: "support" or "need help"
Response: I'm here to assist you—what do you need help with specifically: text, image, or audio encryption?

Default (unrecognized queries)
Response: I'm not sure I understand your question fully, but I'm here to help. Could you provide more details or let me know which type of file you're working with?

Conversation history:
${conversationContext}

Current patient query: ${sanitizedMessage}
`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      });

      typingIndicator.classList.add("hidden");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates.length) {
        throw new Error("No response from Gemini API");
      }

      let botMessage = data.candidates[0].content.parts[0].text.trim();

      if (botMessage.length < 10 || botMessage.includes("I don't understand")) {
        botMessage = "I'm not sure I understood that. Can you rephrase or give more details?";
      }

      appendMessage("bot", botMessage);
      conversationHistory.push({ role: "bot", text: botMessage });
      saveChatMessage("bot", botMessage);
    } catch (error) {
      console.error("Error:", error);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => getBotResponse(userMessage, retryCount + 1), 1000);
        return;
      }
      typingIndicator.classList.add("hidden");
      const errorMessage = "I'm having trouble responding now. Try again later or contact the Admin.";
      appendMessage("bot", errorMessage);
      conversationHistory.push({ role: "bot", text: errorMessage });
      saveChatMessage("bot", errorMessage);
    }
  }
});