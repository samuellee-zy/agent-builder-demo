

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AgentBuilder } from './components/AgentBuilder';
import { ToolsLibrary } from './components/ToolsLibrary';
import { AgentRegistry } from './components/AgentRegistry';
import { Watchtower } from './components/Watchtower';
import { Agent, SAMPLE_AGENTS } from './types';
import { saveAgentsToStorage, loadAgentsFromStorage } from './services/storage';
import { LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('aop');
  
  // Initialize agents from storage, falling back to sample if empty
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>(undefined);

  // Load agents on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await loadAgentsFromStorage();
        setAgents(saved.length > 0 ? saved : SAMPLE_AGENTS);
      } catch (e) {
        console.error("Failed to load agents:", e);
        setAgents(SAMPLE_AGENTS);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence Effect: Save whenever agents change
  useEffect(() => {
    if (!isLoading && agents.length > 0) {
      saveAgentsToStorage(agents);
    }
  }, [agents, isLoading]);

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents(prev => {
        // Update if exists, else add
        const exists = prev.findIndex(a => a.id === newAgent.id);
        if (exists >= 0) {
            const copy = [...prev];
            copy[exists] = newAgent;
            return copy;
        }
        return [newAgent, ...prev];
    });
  };

  const handleDeleteAgent = (agentId: string) => {
      setAgents(prev => prev.filter(a => a.id !== agentId));
      if (selectedAgent?.id === agentId) {
          setSelectedAgent(undefined);
      }
  };

  const [draftId, setDraftId] = useState(() => crypto.randomUUID());

  const resetToNew = () => {
    setDraftId(crypto.randomUUID());
    setSelectedAgent(undefined);
    setActiveTab('aop');
  };

  const handleSelectAgent = (agent: Agent) => {
      setSelectedAgent(agent);
      setActiveTab('aop');
  };

  const Overview = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
      <LayoutDashboard size={64} className="mb-4 opacity-20" />
      <h2 className="text-2xl font-bold text-slate-300">Overview Dashboard</h2>
      <p>System metrics and global agent performance analytics.</p>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-brand-500/30">
      <Sidebar 
        recentAgents={agents} 
        onNewAgent={resetToNew} 
        onSelectAgent={handleSelectAgent}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 flex flex-col h-full bg-slate-900 relative shadow-2xl overflow-hidden">
        {activeTab === 'overview' && <Overview />}
        
        {activeTab === 'watchtower' && (
            <Watchtower 
                agents={agents} 
                onUpdateAgent={handleAgentCreated}
            />
        )}
        
        {activeTab === 'tools' && <ToolsLibrary />}
        
        {activeTab === 'registry' && (
            <AgentRegistry 
                agents={agents} 
                onDeleteAgent={handleDeleteAgent} 
                onUpdateAgent={handleAgentCreated}
            />
        )}
        
        {activeTab === 'aop' && (
          <AgentBuilder 
            key={selectedAgent ? selectedAgent.id : draftId}
            draftId={draftId}
            onAgentCreated={handleAgentCreated} 
            initialAgent={selectedAgent}
          />
        )}
      </main>
    </div>
  );
};

export default App;