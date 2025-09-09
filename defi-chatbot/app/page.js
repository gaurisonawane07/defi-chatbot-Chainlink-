// app/page.js
"use client";

import { useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from './utils/abi';
import { aiRequestSource } from './utils/sourceCode';

// A simple SVG spinner component
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function Home() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [query, setQuery] = useState("What are the risks of impermanent loss in DeFi?");
  
  // New state for better UX
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [requestId, setRequestId] = useState("");
  const [progressSteps, setProgressSteps] = useState([]);

  const addProgressStep = (step) => {
    setProgressSteps(prev => [...prev, step]);
  };

  const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // 1. Ask MetaMask for permission to access accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // 2. Create provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

      // 3. Get signer (now accounts are unlocked)
      const signer = web3Provider.getSigner();

      // 4. Get connected account address
      const connectedAccount = await signer.getAddress();
      setAccount(connectedAccount);

      // 5. Initialize contract
      const chatbotContract = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(chatbotContract);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please check the console.");
    }
  } else {
    alert("MetaMask is not installed. Please install it to use this app.");
  }
};
  
  const resetState = () => {
    setIsLoading(false);
    setResponse("");
    setRequestId("");
    setProgressSteps([]);
  };

  const handleQuerySubmit = async (e) => {
  e.preventDefault();
  if (!contract) return;

  try {
    setIsLoading(true);

    // Send transaction
    const tx = await contract.sendRequest(query);
    const receipt = await tx.wait();

    console.log("Transaction mined:", receipt.transactionHash);

    // ✅ Use queryFilter instead of manual log parsing
    const filter = contract.filters.RequestSent();
    const events = await contract.queryFilter(
      filter,
      receipt.blockNumber,
      receipt.blockNumber
    );

    if (!events.length) {
      throw new Error("Could not find RequestSent event in this block.");
    }

    // Get requestId from event args
    const newRequestId = events[0].args.id;
    setRequestId(newRequestId);
    console.log("Request ID:", newRequestId);

    // ✅ Listen for the response event
    contract.once(contract.filters.AIResponseReceived(newRequestId), (id, response) => {
      console.log("AI response received:", response);
      setResponse(response);
      setIsLoading(false);
    });
  } catch (err) {
    console.error("Error during request:", err);
    setIsLoading(false);
  }
};

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">DeFi AI Chatbot</h1>
          <p className="text-lg text-gray-400">Your decentralized AI assistant powered by Chainlink</p>
        </header>

        {!account ? (
          <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 self-center">
            Connect Wallet
          </button>
        ) : (
          <div className="bg-gray-800 border border-gray-700 text-gray-300 font-mono text-sm p-3 rounded-lg text-center">
            Connected: {account}
          </div>
        )}

        {account && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-lg">
            <form onSubmit={handleQuerySubmit} className="flex flex-col gap-4">
              <label htmlFor="query" className="font-semibold text-lg">Ask a question about DeFi:</label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows="4"
                className="bg-gray-800 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:opacity-50 transition-all"
                placeholder="e.g., Explain yield farming in simple terms."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading} className="bg-blue-600 text-white font-bold py-3 px-5 rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300">
                {isLoading && <Spinner />}
                {isLoading ? 'Processing...' : 'Ask AI'}
              </button>
            </form>
          </div>
        )}

        {(progressSteps.length > 0) && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-lg">
            <h2 className="font-semibold text-lg mb-4">Progress Log</h2>
            <ul className="space-y-2 text-sm text-gray-300 font-mono">
              {progressSteps.map((step, index) => (
                <li key={index} className="flex items-center">
                  {isLoading && index === progressSteps.length - 1 ? <Spinner /> : <span className="mr-3 text-blue-400">✓</span>}
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {response && !isLoading && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-lg animate-fade-in">
            <h2 className="font-semibold text-xl mb-4 text-blue-400">AI Response</h2>
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{response}</p>
            <button onClick={resetState} className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm">
              Ask Another Question
            </button>
          </div>
        )}
      </main>
    </div>
  );
}