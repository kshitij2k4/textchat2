import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.29.109:5000");

const Chat = () => {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({}); // Store private messages by username
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isUsernameSubmitted, setIsUsernameSubmitted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSocketMap, setUserSocketMap] = useState({});
  const [theme, setTheme] = useState("light");
  const [activeChat, setActiveChat] = useState("public"); // 'public' or username for private chat
  const [unreadMessages, setUnreadMessages] = useState({}); // Track unread messages by username
  const chatBoxRef = useRef(null);

  useEffect(() => {
    socket.on("message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("privateMessage", (data) => {
      const chatPartner = data.fromSelf ? data.to : data.from;
      
      setPrivateMessages(prev => {
        const updated = { ...prev };
        if (!updated[chatPartner]) {
          updated[chatPartner] = [];
        }
        updated[chatPartner] = [...updated[chatPartner], data];
        return updated;
      });
      
      // If not currently in this chat, mark as unread
      if (activeChat !== chatPartner) {
        setUnreadMessages(prev => ({
          ...prev,
          [chatPartner]: (prev[chatPartner] || 0) + 1
        }));
      }
    });

    socket.on("users", (users) => {
      setOnlineUsers(users.map(u => u.username));
      setUserSocketMap(users.reduce((acc, user) => {
        acc[user.username] = user.id;
        return acc;
      }, {}));
    });

    socket.on("adminStatus", (status) => {
      setIsAdmin(status);
    });
    
    socket.on("kicked", () => {
      setMessages([]);
      setIsUsernameSubmitted(false);
      setUsername("");
      alert("You have been kicked from the chat");
    });

    return () => {
      socket.off("message");
      socket.off("privateMessage");
      socket.off("users");
      socket.off("adminStatus");
      socket.off("kicked");
    };
  }, [activeChat]);

  useEffect(() => {
    if (isUsernameSubmitted && username.trim()) {
      socket.emit("setUsername", username);
      // Check if admin username (for demo purposes)
      if (username.toLowerCase() === "admin") {
        socket.emit("requestAdminStatus", username);
      }
    }
  }, [isUsernameSubmitted, username]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, privateMessages, activeChat]);

  const handleUsernameChange = (e) => {
    if (!isUsernameSubmitted) {
      setUsername(e.target.value);
    }
  };

  const submitUsername = () => {
    if (username.trim()) {
      setIsUsernameSubmitted(true);
    }
  };
  
  const kickUser = (username) => {
    if (isAdmin && userSocketMap[username]) {
      socket.emit("kickUser", userSocketMap[username]);
      // Notify chat that user was kicked
      socket.emit("sendMessage", { 
        username: "System", 
        message: `${username} has been kicked from the chat` 
      });
    }
  };

  const sendMessage = () => {
    if (message.trim() && username.trim()) {
      if (activeChat === "public") {
        socket.emit("sendMessage", { username, message });
      } else {
        socket.emit("sendPrivateMessage", { 
          username, 
          to: activeChat, 
          message 
        });
      }
      setMessage("");
    }
  };

  const openPrivateChat = (user) => {
    if (user !== username) {
      setActiveChat(user);
      // Clear unread messages when opening chat
      setUnreadMessages(prev => ({
        ...prev,
        [user]: 0
      }));
    }
  };

  const switchToPublicChat = () => {
    setActiveChat("public");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Theme variables
  const colors = {
    light: {
      bg: "#ffffff",
      containerBg: "#f8f9fa",
      text: "#212529",
      primary: "#6366f1", // Indigo
      secondary: "#e2e8f0",
      accent: "#8b5cf6", // Purple
      border: "#d1d5db",
      systemMsg: "#9ca3af",
      userListBg: "#f1f5f9",
      buttonHover: "#4f46e5",
      inputBg: "#ffffff",
      shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      privateChat: "#fef3c7", // Light yellow
      privateChatText: "#92400e"
    },
    dark: {
      bg: "#1a1a2e",
      containerBg: "#0f172a",
      text: "#e2e8f0",
      primary: "#818cf8", // Light Indigo
      secondary: "#334155",
      accent: "#a78bfa", // Light Purple
      border: "#334155",
      systemMsg: "#6b7280",
      userListBg: "#1e293b",
      buttonHover: "#6366f1",
      inputBg: "#1e293b",
      shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
      privateChat: "#422006", // Dark amber
      privateChatText: "#fef3c7"
    }
  };

  const currentTheme = colors[theme];

  // App header styles
  const headerStyles = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    marginBottom: "24px",
    borderBottom: `1px solid ${currentTheme.border}`
  };

  // Container styles
  const containerStyles = {
    maxWidth: "900px",
    margin: "40px auto",
    padding: "24px",
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    backgroundColor: currentTheme.containerBg,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: "12px",
    boxShadow: currentTheme.shadow,
    transition: "all 0.3s ease"
  };

  // Message bubble styles
  const getBubbleStyle = (msg) => {
    const isCurrentUser = msg.username === username || msg.fromSelf;
    const isSystem = msg.username === "System";
    const isPrivate = msg.private;
    
    if (isSystem) {
      return {
        padding: "8px 12px",
        marginBottom: "10px",
        color: currentTheme.systemMsg,
        textAlign: "center",
        fontSize: "13px",
        fontStyle: "italic"
      };
    }
    
    return {
      backgroundColor: isCurrentUser 
        ? (isPrivate ? "#9333ea" : currentTheme.primary) 
        : (isPrivate ? "#7e22ce" : currentTheme.secondary),
      color: isCurrentUser ? "#fff" : (isPrivate ? "#fff" : currentTheme.text),
      padding: "10px 16px",
      borderRadius: "18px",
      borderTopLeftRadius: !isCurrentUser ? "4px" : "18px",
      borderTopRightRadius: isCurrentUser ? "4px" : "18px",
      maxWidth: "80%",
      marginBottom: "10px",
      alignSelf: isCurrentUser ? "flex-end" : "flex-start",
      wordBreak: "break-word",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
    };
  };

  // Username input form or chat interface based on submission state
  const renderContent = () => {
    if (!isUsernameSubmitted) {
      return (
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          padding: "20px"
        }}>
          <div 
            style={{
              width: "100%",
              maxWidth: "300px",
              margin: "0 auto",
              padding: "30px 90px", // Increased horizontal padding from 30px to 40px
              backgroundColor: currentTheme.inputBg,
              borderRadius: "12px",
              boxShadow: currentTheme.shadow,
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Join the Conversation</h3>
            <div style={{ marginBottom: "20px" }}>
              <label 
                htmlFor="username" 
                style={{ 
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Choose a username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={handleUsernameChange}
                onKeyDown={(e) => e.key === "Enter" && submitUsername()}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${currentTheme.border}`,
                  backgroundColor: currentTheme.inputBg,
                  color: currentTheme.text,
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.3s ease"
                }}
              />
            </div>
            <button
              onClick={submitUsername}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: currentTheme.primary,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
                transition: "background-color 0.3s ease",
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = currentTheme.buttonHover}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = currentTheme.primary}
            >
              Join Chat
            </button>
          </div>
        </div>
      );
    }

    // Determine which messages to show based on active chat
    const currentMessages = activeChat === "public" 
      ? messages 
      : (privateMessages[activeChat] || []);

    return (
      <div style={{ display: "flex", gap: "20px", height: "520px" }}>
        {/* Chat Box */}
        <div style={{ flex: 3, display: "flex", flexDirection: "column" }}>
          {/* Chat Tabs */}
          <div style={{ 
            display: "flex", 
            marginBottom: "12px",
            borderBottom: `1px solid ${currentTheme.border}`,
            overflowX: "auto",
            whiteSpace: "nowrap"
          }}>
            <div 
              onClick={switchToPublicChat}
              style={{ 
                padding: "8px 16px", 
                cursor: "pointer",
                fontWeight: activeChat === "public" ? "600" : "normal",
                borderBottom: activeChat === "public" ? `2px solid ${currentTheme.primary}` : "none",
                color: activeChat === "public" ? currentTheme.primary : currentTheme.text,
                transition: "all 0.2s ease"
              }}
            >
              Public Chat
            </div>
            
            {Object.keys(privateMessages).map(user => (
              <div 
                key={user}
                onClick={() => openPrivateChat(user)}
                style={{ 
                  padding: "8px 16px", 
                  cursor: "pointer",
                  fontWeight: activeChat === user ? "600" : "normal",
                  borderBottom: activeChat === user ? `2px solid ${currentTheme.primary}` : "none",
                  color: activeChat === user ? currentTheme.primary : currentTheme.text,
                  transition: "all 0.2s ease",
                  position: "relative"
                }}
              >
                {user}
                {unreadMessages[user] > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {unreadMessages[user]}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Active Chat Indicator */}
          {activeChat !== "public" && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "8px",
              padding: "6px 12px",
              backgroundColor: currentTheme.privateChat,
              color: currentTheme.privateChatText,
              borderRadius: "6px",
              fontSize: "13px"
            }}>
              <span style={{ marginRight: "8px" }}>🔒</span>
              Private chat with <strong style={{ marginLeft: "4px" }}>{activeChat}</strong>
            </div>
          )}
          
          <div
            className="chat-box"
            ref={chatBoxRef}
            style={{
              flex: 1,
              overflowY: "auto",
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "12px",
              padding: "16px",
              backgroundColor: currentTheme.inputBg,
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {activeChat === "public" ? (
              // Public messages
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  style={getBubbleStyle(msg)}
                >
                  {msg.username !== "System" && (
                    <div 
                      style={{ 
                        fontWeight: "600", 
                        fontSize: "13px", 
                        marginBottom: "4px",
                        opacity: msg.username === username ? 0.8 : 0.9
                      }}
                    >
                      {msg.username === username ? "You" : msg.username}
                    </div>
                  )}
                  <div>{msg.message}</div>
                </div>
              ))
            ) : (
              // Private messages
              (privateMessages[activeChat] || []).map((msg, index) => (
                <div 
                  key={index} 
                  style={getBubbleStyle(msg)}
                >
                  <div 
                    style={{ 
                      fontWeight: "600", 
                      fontSize: "13px", 
                      marginBottom: "4px",
                      opacity: msg.fromSelf ? 0.8 : 0.9
                    }}
                  >
                    {msg.fromSelf ? "You" : msg.from}
                  </div>
                  <div>{msg.message}</div>
                </div>
              ))
            )}
            
            {/* Empty state for new private chats */}
            {activeChat !== "public" && (!privateMessages[activeChat] || privateMessages[activeChat].length === 0) && (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: currentTheme.systemMsg,
                fontStyle: "italic"
              }}>
                No messages yet. Start the conversation with {activeChat}!
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder={`Type your message${activeChat !== "public" ? ` to ${activeChat}` : ""}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "8px",
                border: `1px solid ${currentTheme.border}`,
                backgroundColor: currentTheme.inputBg,
                color: currentTheme.text,
                outline: "none"
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: activeChat === "public" ? currentTheme.primary : "#9333ea",
                color: "#fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
                transition: "background-color 0.3s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = activeChat === "public" ? currentTheme.buttonHover : "#7e22ce"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = activeChat === "public" ? currentTheme.primary : "#9333ea"}
            >
              Send
            </button>
          </div>
        </div>

        {/* Online Users */}
        <div
          style={{
            flex: 1,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "12px",
            padding: "16px",
            backgroundColor: currentTheme.userListBg,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <h4 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#10b981", fontSize: "10px" }}>●</span> Online Users 
            <span style={{ 
              marginLeft: "auto", 
              backgroundColor: currentTheme.secondary, 
              color: currentTheme.text,
              fontSize: "12px", 
              padding: "2px 8px", 
              borderRadius: "12px" 
            }}>
              {onlineUsers.length}
            </span>
          </h4>
          
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {onlineUsers.map((user, index) => (
                <li 
                  key={index} 
                  style={{ 
                    marginBottom: "10px", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: user === username || activeChat === user ? `${currentTheme.accent}20` : "transparent"
                  }}
                >
                  <span style={{ 
                    fontWeight: user === username ? "600" : "normal",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    {user === username ? "You" : user}
                    {user.toLowerCase() === "admin" && (
                      <span style={{ 
                        fontSize: "11px", 
                        backgroundColor: "#f43f5e", 
                        color: "white",
                        padding: "1px 6px",
                        borderRadius: "4px"
                      }}>
                        ADMIN
                      </span>
                    )}
                    {unreadMessages[user] > 0 && (
                      <span style={{ 
                        fontSize: "11px", 
                        backgroundColor: "#ef4444", 
                        color: "white",
                        padding: "1px 6px",
                        borderRadius: "10px"
                      }}>
                        {unreadMessages[user]} new
                      </span>
                    )}
                  </span>
                  
                  <div style={{ display: "flex", gap: "6px" }}>
                    {user !== username && (
                      <button
                        onClick={() => openPrivateChat(user)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#8b5cf6", // Purple
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          opacity: 0.9,
                          transition: "opacity 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                        onMouseOut={(e) => e.currentTarget.style.opacity = 0.9}
                      >
                        <span style={{ fontSize: "10px" }}>💬</span>
                        Chat
                      </button>
                    )}
                    
                    {isAdmin && user !== username && (
                      <button
                        onClick={() => kickUser(user)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#f43f5e",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          opacity: 0.9,
                          transition: "opacity 0.2s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                        onMouseOut={(e) => e.currentTarget.style.opacity = 0.9}
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {isAdmin && (
            <div style={{ 
              marginTop: "16px", 
              padding: "10px", 
              backgroundColor: "#fef3c7", 
              borderRadius: "8px", 
              fontSize: "13px",
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ fontWeight: "bold" }}>⚠️</span>
              Admin Mode Active
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      ...containerStyles,
      backgroundColor: currentTheme.containerBg
    }}>
      <div style={headerStyles}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: currentTheme.primary }}></span>
          Chat-Box
        </h2>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isUsernameSubmitted && (
            <div style={{ 
              fontSize: "14px", 
              color: currentTheme.text,
              opacity: 0.8
            }}>
              Logged in as <strong>{username}</strong>
            </div>
          )}
          
          <button
            onClick={toggleTheme}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default Chat;