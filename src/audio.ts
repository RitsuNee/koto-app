export const playVoicevox = async (text: string, speaker: number = 1) => {
  try {
    const baseUrl = localStorage.getItem('voicevoxUrl') || 'http://localhost:50021';
    
    // 1. Generate audio query
    const queryResponse = await fetch(`${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
      method: 'POST',
    });
    
    if (!queryResponse.ok) {
      throw new Error('Failed to create audio query from Voicevox.');
    }
    
    const queryJson = await queryResponse.json();
    
    // 2. Synthesize audio
    const synthesisResponse = await fetch(`${baseUrl}/synthesis?speaker=${speaker}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryJson),
    });
    
    if (!synthesisResponse.ok) {
      throw new Error('Failed to synthesize audio from Voicevox.');
    }
    
    const audioBlob = await synthesisResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 3. Play audio
    const audio = new Audio(audioUrl);
    audio.play();
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (error) {
    console.error('Voicevox Error:', error);
    alert('Could not play audio. Make sure Voicevox is running locally at the URL specified in Settings.');
  }
};
