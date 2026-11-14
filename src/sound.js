// Short, quiet Web Audio cues. The context is created only after a user gesture.
let context;
let output;
let voices = [];
let generation = 0;
const cues = {
 correct: [[523.25, 0, .09], [783.99, .08, .15]],
 incorrect: [[196, 0, .13], [146.83, .1, .17]],
 penalty: [[220, 0, .13], [174.61, .12, .13], [130.81, .24, .2]],
 won: [[523.25, 0, .13], [659.25, .12, .13], [783.99, .24, .13], [1046.5, .38, .33]],
 lost: [[329.63, 0, .2], [261.63, .18, .2], [196, .36, .34]],
};

export function stopSound() {
 generation++;
 for (const voice of voices) { try { voice.stop(); } catch { /* Already finished. */ } }
 voices = [];
}

// Unlock during the user gesture, before waiting for a server response.
export async function unlockSound() {
 try {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  if (!context) {
   context = new Audio();
   output = context.createGain();
   output.gain.value = .12;
   output.connect(context.destination);
  }
  if (context.state === 'suspended') await context.resume();
 } catch { /* Some browsers or devices do not allow audio. */ }
}
export async function playSound(name) {
 stopSound();
 const request = generation;
 try {
  await unlockSound();
  if (!context || !cues[name] || request !== generation || context.state !== 'running') return;
  for (const [frequency, offset, duration] of cues[name]) {
   const oscillator = context.createOscillator();
   const envelope = context.createGain();
   const start = context.currentTime + .01 + offset;
   oscillator.type = 'sine';
   oscillator.frequency.value = frequency;
   envelope.gain.setValueAtTime(0, start);
   envelope.gain.linearRampToValueAtTime(1, start + .012);
   envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
   oscillator.connect(envelope);
   envelope.connect(output);
   oscillator.onended = () => {
    oscillator.disconnect(); envelope.disconnect();
    voices = voices.filter(voice => voice !== oscillator);
   };
   voices.push(oscillator);
   oscillator.start(start);
   oscillator.stop(start + duration + .02);
  }
 } catch { /* Audio is optional: browser restrictions never interrupt a game. */ }
}
