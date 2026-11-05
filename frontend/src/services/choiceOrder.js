// Derive a stable order from the attempt and question IDs. A saved answer remains
// the option text, so changing display order never changes what is submitted.
export function orderedChoices(question, submissionId, shuffleChoices) {
  const choices = Object.values(question.options || {});
  if (!shuffleChoices || !submissionId || question.type !== 'multiple_choice') return choices;

  let seed = 2166136261;
  for (const character of `${submissionId}:${question.id}`) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  for (let index = choices.length - 1; index > 0; index--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    const swapWith = seed % (index + 1);
    [choices[index], choices[swapWith]] = [choices[swapWith], choices[index]];
  }
  return choices;
}
