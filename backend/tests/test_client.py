import asyncio
import websockets
import wave
import json
import sys
import os

AUDIO_FILE = "tests/jfk.wav"
SERVER_URL = "ws://localhost:8000/ws/transcribe"

async def send_audio():
    if not os.path.exists(AUDIO_FILE):
        print(f"Error: {AUDIO_FILE} not found.")
        return

    print(f"Opening {AUDIO_FILE}...")
    try:
        wf = wave.open(AUDIO_FILE, "rb")
    except Exception as e:
        print(f"Error opening wave file: {e}")
        return

    # Verify format
    if wf.getnchannels() != 1 or wf.getframerate() != 16000 or wf.getsampwidth() != 2:
        print("Warning: Audio file must be 16kHz, 16-bit, Mono.")
        print(f"Got: {wf.getnchannels()} channels, {wf.getframerate()} Hz, {wf.getsampwidth()} bytes/sample")
        # In a real test we might want to convert, but for this quick test we expect jfk.wav to be correct.
    
    frames = wf.readframes(wf.getnframes())
    wf.close()
    
    print(f"Connecting to {SERVER_URL}...")
    try:
        async with websockets.connect(SERVER_URL) as websocket:
            print("Connected.")
            
            # Send audio in chunks to simulate streaming
            CHUNK_SIZE = 4096 # bytes
            total_bytes = len(frames)
            sent_bytes = 0
            
            print(f"Sending {total_bytes} bytes of audio...")
            
            # Create a task to listen for responses continuously
            async def receive_messages():
                try:
                    while True:
                        response = await websocket.recv()
                        data = json.loads(response)
                        if data.get("type") == "transcription":
                            final_tag = "[FINAL]" if data.get("is_final") else "[PARTIAL]"
                            print(f"\n[RECEIVED TRANSCRIPTION] {final_tag}:")
                            for segment in data["segments"]:
                                print(f"  {segment['start']}-{segment['end']}: {segment['text']}")
                except websockets.exceptions.ConnectionClosed:
                    print("\nConnection closed by server.")
                except Exception as e:
                    print(f"\nError receiving: {e}")

            recv_task = asyncio.create_task(receive_messages())

            while sent_bytes < total_bytes:
                chunk = frames[sent_bytes:sent_bytes+CHUNK_SIZE]
                await websocket.send(chunk)
                sent_bytes += len(chunk)
                await asyncio.sleep(0.01) # Simulate real-time delay (roughly)
            
            print("\nAudio sent. Waiting for final processing...")
            await asyncio.sleep(2) # Wait a bit for server to catch up
            
            # Close connection
            await websocket.close()
            # Cancel receive task
            recv_task.cancel()
            
    except Exception as e:
        print(f"Connection error: {e}")
        print("Make sure the backend is running: npm run backend:dev")

if __name__ == "__main__":
    try:
        asyncio.run(send_audio())
    except KeyboardInterrupt:
        pass
