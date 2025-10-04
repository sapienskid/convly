import { CanvasWorkspace } from './components/CanvasWorkspace';
import { RightPanel } from './components/RightPanel';
import { BottomToolbar } from './components/BottomToolbar';
import { CharacterEditModal } from './components/CharacterEditModal';
import { useAppStore } from './store';

function App() {
  const {
    selectedTool,
    selectedElement,
    editingCharacter,
    previewState,
    isGenerating,
    customizeSettings,
    characters,
    messages,
    connections,
    setSelectedTool,
    setSelectedElement,
    setEditingCharacter,
    addCharacterAtPosition,
    addMessageAtPosition,
    addMessageForCharacter,
    createConnection,
    deleteConnection,
    deleteElement,
    handleGenerateVideo,
    handleTemplateSelect,
    handleApplyCustomization,
    updateCharacterPosition,
    updateMessagePosition,
    updateMessageText,
    updateCharacterRotation,
    updateMessageRotation
  } = useAppStore();

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Canvas Workspace */}
        <div className="w-[60%] bg-white border-r border-gray-200 relative flex flex-col">
          <div className="flex-1">
            <CanvasWorkspace
              characters={characters}
              messages={messages}
              connections={connections}
              selectedTool={selectedTool}
              selectedElement={selectedElement}
              onCharacterMove={updateCharacterPosition}
              onMessageMove={updateMessagePosition}
              onMessageTextUpdate={updateMessageText}
              onElementSelect={setSelectedElement}
              onAddMessage={addMessageForCharacter}
              onAddMessageAtPosition={addMessageAtPosition}
              onAddCharacterAtPosition={addCharacterAtPosition}
              onDeleteElement={deleteElement}
              onConnectionCreate={createConnection}
              onConnectionDelete={deleteConnection}
              onCharacterEdit={setEditingCharacter}
              onCharacterRotate={updateCharacterRotation}
              onMessageRotate={updateMessageRotation}
            />
          </div>
          
          {/* Bottom Toolbar - Only in left panel */}
          <BottomToolbar
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            selectedElement={selectedElement}
            elementCount={{
              characters: characters.length,
              messages: messages.length,
              connections: connections.length
            }}
          />
        </div>

        {/* Right Panel - Phone Preview with Controls */}
        <div className="flex-1 min-w-0">
          <RightPanel
            characters={characters}
            messages={messages}
            connections={connections}
            previewState={previewState}
            isGenerating={isGenerating}
            customizeSettings={customizeSettings}
            onTemplateSelect={handleTemplateSelect}
            onCustomizationApply={handleApplyCustomization}
            onGenerateVideo={handleGenerateVideo}
          />
        </div>
      </div>

      {/* Character Edit Modal */}
      {editingCharacter && (
        <CharacterEditModal
          characterId={editingCharacter}
          onClose={() => setEditingCharacter(null)}
        />
      )}
    </div>
  );
}

export default App;