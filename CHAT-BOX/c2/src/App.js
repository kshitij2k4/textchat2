import React from "react";
import Chat from "./Chat";

function App() {
  return (
    <div className="App" style={{ 
      minHeight: "100vh",
      background: "linear-gradient(to bottom right, #f0f9ff, #e0f2fe)",
      paddingTop: "20px",
      paddingBottom: "20px"
    }}>
      <Chat />
    </div>
  );
}

export default App;