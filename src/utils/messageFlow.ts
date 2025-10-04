import { Message, Connection } from '../store';

export interface MessageFlowInfo {
  message: Message;
  isFirst: boolean;
  isLast: boolean;
  flowIndex: number;
  hasIncomingFlow: boolean;
  hasOutgoingFlow: boolean;
}

/**
 * Analyzes message flow and returns ordered messages with flow metadata
 */
export function analyzeMessageFlow(
  messages: Message[],
  connections: Connection[]
): MessageFlowInfo[] {
  if (messages.length === 0) return [];

  // Filter flow connections (message-to-message)
  const flowConnections = connections.filter(c => c.type === 'flow');
  const messageIds = new Set(messages.map(m => m.id));
  const messageFlowConnections = flowConnections.filter(c => 
    messageIds.has(c.from) && messageIds.has(c.to)
  );

  // Build flow graph
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();
  
  messageFlowConnections.forEach(conn => {
    if (!outgoingEdges.has(conn.from)) {
      outgoingEdges.set(conn.from, []);
    }
    if (!incomingEdges.has(conn.to)) {
      incomingEdges.set(conn.to, []);
    }
    
    outgoingEdges.get(conn.from)!.push(conn.to);
    incomingEdges.get(conn.to)!.push(conn.from);
  });

  // Find root messages (no incoming flow connections)
  const rootMessages = messages.filter(m => !incomingEdges.has(m.id));
  
  // Topological sort for message order
  const visited = new Set<string>();
  const result: Message[] = [];
  
  const dfs = (messageId: string) => {
    if (visited.has(messageId)) return;
    visited.add(messageId);
    
    const message = messages.find(m => m.id === messageId);
    if (message) {
      result.push(message);
    }
    
    // Visit outgoing messages
    const outgoing = outgoingEdges.get(messageId) || [];
    outgoing.forEach(nextId => dfs(nextId));
  };
  
  // Start DFS from root messages
  rootMessages.forEach(msg => dfs(msg.id));
  
  // Add any remaining messages (disconnected from flow)
  messages.forEach(msg => {
    if (!visited.has(msg.id)) {
      result.push(msg);
    }
  });

  // Generate flow info
  return result.map((message, index) => ({
    message,
    isFirst: !incomingEdges.has(message.id) || incomingEdges.get(message.id)!.length === 0,
    isLast: !outgoingEdges.has(message.id) || outgoingEdges.get(message.id)!.length === 0,
    flowIndex: index,
    hasIncomingFlow: incomingEdges.has(message.id) && incomingEdges.get(message.id)!.length > 0,
    hasOutgoingFlow: outgoingEdges.has(message.id) && outgoingEdges.get(message.id)!.length > 0,
  }));
}

/**
 * Gets the next message in the flow sequence
 */
export function getNextMessage(
  currentMessageId: string,
  connections: Connection[]
): string | null {
  const flowConnection = connections.find(c => 
    c.type === 'flow' && c.from === currentMessageId
  );
  return flowConnection?.to || null;
}

/**
 * Gets the previous message in the flow sequence
 */
export function getPreviousMessage(
  currentMessageId: string,
  connections: Connection[]
): string | null {
  const flowConnection = connections.find(c => 
    c.type === 'flow' && c.to === currentMessageId
  );
  return flowConnection?.from || null;
}

/**
 * Validates message flow for potential issues
 */
export function validateMessageFlow(
  messages: Message[],
  connections: Connection[]
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const flowInfo = analyzeMessageFlow(messages, connections);
  const messagesWithoutSpeakers = flowInfo.filter(info => !info.message.characterId);
  
  // Check for messages without speakers
  if (messagesWithoutSpeakers.length > 0) {
    issues.push(`${messagesWithoutSpeakers.length} message(s) don't have speakers assigned`);
    suggestions.push('Connect characters to messages to assign speakers');
  }
  
  // Check for orphaned messages
  const orphanedMessages = flowInfo.filter(info => !info.hasIncomingFlow && !info.hasOutgoingFlow);
  if (orphanedMessages.length > 1) {
    issues.push(`${orphanedMessages.length} messages are not connected to the conversation flow`);
    suggestions.push('Connect messages with flow arrows to create conversation sequence');
  }
  
  // Check for multiple conversation starts
  const firstMessages = flowInfo.filter(info => info.isFirst);
  if (firstMessages.length > 1) {
    issues.push(`${firstMessages.length} messages are marked as conversation starters`);
    suggestions.push('Consider connecting some starting messages to create a single conversation flow');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}