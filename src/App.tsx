

/**
 * @file src/App.tsx
 * @description Main Application Shell.
 * 
 * RESPONSIBILITIES:
 * 1. **Global State**: Manages the list of Agents and the Active Tab.
 * 2. **Persistence**: Syncs agents to IndexedDB via storage service.
 * 3. **Routing**: Simple client-side tab switching (Architect, Watchtower, Registry, Tools).
 * 4. **Layout**: Renders the Sidebar and Main Content Area.
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AgentBuilder } from './components/AgentBuilder';
import { ToolsLibrary } from './components/ToolsLibrary';
import { AgentRegistry } from './components/AgentRegistry';
import { Watchtower } from './components/Watchtower';
import { Overview } from './components/Overview';
import { Agent, SAMPLE_AGENTS } from './types';
import { saveAgentsToStorage, loadAgentsFromStorage } from './services/storage';
import { LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('aop'); // Default to Architect (Agent Operating Procedure)
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [builderResetKey, setBuilderResetKey] = useState(0);

  // Load persistence
  useEffect(() => {
    const init = async () => {
      // 1. Load Custom Agents (User created) from IndexedDB
      const stored = await loadAgentsFromStorage();

      // 2. Merge with Sample Agents
      // STRATEGY: We want to ensure the "Demo" experience always has content.
      // We combine stored agents with hardcoded samples, deduplicating by ID.
      const allAgents = [...stored];

      SAMPLE_AGENTS.forEach(sample => {
        if (!allAgents.find(a => a.id === sample.id)) {
          allAgents.push(sample);
        }
      });

      setAgents(allAgents);
    };
    init();
  }, []);

  // Draft Session ID (for fresh "New Agent" sessions)
  const [draftId, setDraftId] = useState<string>(() => `draft-${Date.now()}`);

  const handleCreateAgent = (newAgent: Agent) => {
    setAgents(prev => {
      const exists = prev.find(a => a.id === newAgent.id);
      const updated = exists
        ? prev.map(a => a.id === newAgent.id ? newAgent : a)
        : [...prev, newAgent];
      saveAgentsToStorage(updated);
      return updated;
    });
    // Optional: Don't auto-switch to registry on every auto-save, only if explicit "Done"?
    // AgentBuilder auto-saves frequently.
  };

  const handleDeleteAgent = (id: string) => {
    const updated = agents.filter(a => a.id !== id);
    setAgents(updated);
    saveAgentsToStorage(updated);
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    const updated = agents.map(a => a.id === updatedAgent.id ? updatedAgent : a);
    setAgents(updated);
    saveAgentsToStorage(updated);
  };

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-brand-500/30">

      <Sidebar 
        recentAgents={agents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)}
        onNewAgent={() => {
          setSelectedAgentId(null);
          setDraftId(`draft-${Date.now()}`); // Generate new unique draft ID
          setBuilderResetKey(prev => prev + 1); // Force new session
          setActiveTab('aop'); // Use AOP for Builder
        }}
        onSelectAgent={(agent) => {
          if (selectedAgentId === agent.id) {
            setBuilderResetKey(prev => prev + 1); // Force reset if clicking same agent
          }
          setSelectedAgentId(agent.id);
          setActiveTab('aop');
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-white shadow-lg"
        >
          <LayoutDashboard size={20} />
        </button>
        </div>

      <main className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
        {activeTab === 'overview' && (
          <Overview
            agents={agents} 
            onNavigate={setActiveTab}
            onNewAgent={() => {
              setSelectedAgentId(null);
              setDraftId(`draft-${Date.now()}`);
              setBuilderResetKey(prev => prev + 1);
              setActiveTab('aop');
            }}
          />
        )}

        {/* Deprecated 'builder' tab in favor of 'aop' for consistency, but keeping if refs exist */}
        {activeTab === 'builder' && (
          <AgentBuilder
            onAgentCreated={handleCreateAgent}
          />
        )}

        {activeTab === 'registry' && (
          <AgentRegistry
            agents={agents}
            onDeleteAgent={handleDeleteAgent}
            onUpdateAgent={handleUpdateAgent}
            onEditAgent={(agent) => {
              setSelectedAgentId(agent.id);
              setActiveTab('aop');
            }}
            onSelectAgent={(agent) => {
              if (selectedAgentId === agent.id) {
                setBuilderResetKey(prev => prev + 1);
              }
              setSelectedAgentId(agent.id);
              // We might want to switch to 'aop' or just stay in registry? 
              // Usually 'Select' implies focus. Let's switch to 'aop' for now as that's the main "View" mode for this app structure.
              setActiveTab('aop');
            }}
          />
        )}

        {activeTab === 'watchtower' && (
          <Watchtower
            agents={agents}
            onUpdateAgent={handleUpdateAgent}
          />
        )}

        {activeTab === 'tools' && <ToolsLibrary />}

        {activeTab === 'aop' && (
          <AgentBuilder
            key={`${selectedAgentId || 'new'}-${builderResetKey}`}
            initialAgent={agents.find(a => a.id === selectedAgentId)}
            onAgentCreated={handleCreateAgent}
            draftId={selectedAgentId ? undefined : draftId}
          />
        )}
      </main>
    </div>
  );
};

export default App;