// frontend/src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bot, X, MessageSquare, Send } from 'lucide-react'; // Icon imports

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hello! I'm your friendly blood bank assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null); // Ref for auto-scrolling

  // Auto-scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get auth token directly from localStorage
      const token = localStorage.getItem('authToken'); 
      const config = { headers: { 'x-auth-token': token } };
      
      const res = await axios.post('http://localhost:5000/api/gemini/chat', { prompt: input }, config);
      
      const botMessage = { from: 'bot', text: res.data.response };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with chatbot API:", error);
      const errorMessage = { from: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-br from-red-500 to-pink-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-300"
          aria-label="Toggle Chat"
        >
          {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
        </button>
      </div>

      {/* Chat Popup Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[32rem] bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col z-50 border border-red-100 transform transition-all duration-300 origin-bottom-right animate-pop-in">
          {/* Header */}
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-4 rounded-t-2xl text-white flex items-center space-x-3 shadow-lg">
            <Bot size={24} />
            <h3 className="font-bold text-lg">BloodBridge Assistant</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : ''}`}>
                  {msg.from === 'bot' && <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
                  <div className={`max-w-xs break-words px-4 py-2 rounded-2xl ${msg.from === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                   <div className="flex items-end gap-2">
                     <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>
                     <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none">
                         <div className="flex items-center space-x-1">
                             <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                             <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                             <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-300"></span>
                         </div>
                     </div>
                   </div>
              )}
              {/* Dummy div for auto-scrolling */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-red-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-200 transition-all duration-300 font-semibold"
                disabled={isLoading}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:bg-gray-400" disabled={isLoading}>
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

// This line makes the component available to be imported by other files
export default Chatbot;