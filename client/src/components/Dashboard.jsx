import React, { useState } from 'react';
import { Send, Code, GitBranch, CheckCircle, AlertCircle, Settings, FileCode, TestTube, MessageSquare } from 'lucide-react';
import axios from 'axios';


const JiraPipelineUI = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [results, setResults] = useState(null);

  const steps = [
    { id: 'fetch', icon: MessageSquare, label: 'Fetching Jira ticket', color: 'text-blue-500' },
    { id: 'parse', icon: Code, label: 'Parsing requirements', color: 'text-purple-500' },
    { id: 'generate', icon: FileCode, label: 'Generating code', color: 'text-green-500' },
    { id: 'test', icon: TestTube, label: 'Creating tests', color: 'text-orange-500' },
    { id: 'deploy', icon: GitBranch, label: 'Creating PR', color: 'text-indigo-500' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitted input:', input); 
    if (!input.trim()) return;
    console.log(input);
    
    setIsProcessing(true);
    setResults(null);

    // Simulate the pipeline process
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i].id);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Mock results
    setResults({
      ticket: {
        key: 'DEV-123',
        title: 'Add user authentication endpoint',
        status: 'In Progress → Code Review'
      },
      branch: 'feature/DEV-123-auth',
      files: ['src/auth/service.js', 'tests/auth.test.js'],
      coverage: '92%',
      prUrl: 'https://github.com/your-org/repo/pull/456'
    });

    try {
        const response = await axios.post(
          "http://localhost:5000/api/jira/pipeline",
          { ticketUrl: input },
          { withCredentials: true }
        );
        setResults(response.data);
        setCurrentStep(null);
      } catch (err) {
        setResults({
          error: err.response?.data?.message || "Failed to process Jira ticket"
        })
      }
    setCurrentStep(null);
    setIsProcessing(false);
  };

  const isValidJiraUrl = (url) => {
    return url.includes('atlassian.net/browse/') || url.includes('jira.') || url.match(/[A-Z]+-\d+/);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Jira-to-Code Pipeline</h1>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Welcome Section */}
          {!isProcessing && !results && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Transform Jira tickets into production-ready code
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Paste a Jira ticket URL and watch as we automatically generate code, tests, and create a pull request.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
                    <step.icon className={`w-8 h-8 ${step.color} mb-2`} />
                    <span className="text-sm font-medium text-gray-700 text-center">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your Jira ticket URL here... (e.g., https://your-org.atlassian.net/browse/DEV-123)"
                  className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isProcessing}
                  className="absolute bottom-3 right-3 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {input && !isValidJiraUrl(input) && (
                <div className="flex items-center space-x-2 text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please enter a valid Jira ticket URL or ticket key (e.g., DEV-123)</span>
                </div>
              )}
            </div>
          </div>

          {/* Processing Steps */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing your request...</h3>
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                  
                  return (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : isActive ? (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>
                      <span className={`${isActive ? 'text-blue-600 font-medium' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                      {isActive && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Pipeline completed successfully!</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Jira Ticket</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="font-mono text-sm text-blue-600">{results.ticket.key}</p>
                      <p className="text-sm text-gray-700">{results.ticket.title}</p>
                      <p className="text-xs text-green-600 mt-1">Status: {results.ticket.status}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Generated Files</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {results.files.map((file, index) => (
                        <p key={index} className="font-mono text-sm text-gray-700">{file}</p>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Git Integration</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 mb-1">Branch: <span className="font-mono text-blue-600">{results.branch}</span></p>
                      <p className="text-sm text-gray-700">Test Coverage: <span className="font-semibold text-green-600">{results.coverage}</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pull Request</h4>
                    <a 
                      href={results.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>View PR</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setInput('');
                  setResults(null);
                }}
                className="mt-6 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Process another ticket
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          Powered by AI • Integrated with Void Editor • Built for developers
        </div>
      </footer>
    </div>
  );
};

export default JiraPipelineUI;