// Only actual conversation turns help resolve follow-up questions. Introductory
// messages and request errors are interface state, not evidence about a module.
export function materialChatHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(message => message?.includeInHistory === true
      && ['user', 'bot'].includes(message.from) && typeof message.text === 'string')
    .map(message => ({
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.text.trim().slice(0, 1000),
    }))
    .filter(message => message.content !== '')
    .slice(-6);
}

// Sources are supplied separately by retrieval. Render labels as plain text,
// never as HTML or provider-supplied links, and ignore malformed metadata.
export function materialChatSources(sources) {
  if (!Array.isArray(sources)) return [];
  const labels = sources
    .filter(source => source && typeof source.label === 'string')
    .map(source => [...source.label].filter(character => {
      const code = character.codePointAt(0);
      return code >= 32 && code !== 127;
    }).join('').trim().slice(0, 80))
    .filter(Boolean);
  return [...new Set(labels)].slice(0, 8);
}
