import asyncio
import websockets
import json
import os

async def test_session_hub():
    uri_listener = "ws://localhost:8000/ws/session?role=listener"
    uri_viewer = "ws://localhost:8000/ws/session?role=viewer"
    headers = {"Origin": "http://localhost:3000"}
    
    audio_file = os.path.join(os.path.dirname(__file__), "jfk.wav")
    
    if not os.path.exists(audio_file):
        print(f"Error: {audio_file} not found.")
        return

    try:
        async with websockets.connect(uri_viewer, additional_headers=headers) as websocket_viewer:
            print("Viewer connected.")
            
            # Expect initial state sync
            initial_state = json.loads(await websocket_viewer.recv())
            print(f"Viewer received initial state type: {initial_state.get('type')}")

            async with websockets.connect(uri_listener, additional_headers=headers) as websocket_listener:
                print("Listener connected.")
                
                # Read WAV file and skip header (44 bytes for standard RIFF/WAVE PCM)
                with open(audio_file, "rb") as f:
                    f.seek(44) 
                    audio_bytes = f.read()
                
                # Stream in 1s chunks (32000 bytes for 16kHz 16-bit mono)
                chunk_size = 32000
                for i in range(0, len(audio_bytes), chunk_size):
                    chunk = audio_bytes[i:i + chunk_size]
                    await websocket_listener.send(chunk)
                    await asyncio.sleep(0.5) # Slight delay to simulate real-time
                
                print("Listener finished streaming audio.")
                
                # Now wait for the viewer to receive the transcription
                print("Waiting for viewer to receive transcription...")
                while True:
                    try:
                        response = await asyncio.wait_for(websocket_viewer.recv(), timeout=10.0)
                        data = json.loads(response)
                        if data.get("type") == "transcription_update":
                            text = " ".join([seg["text"] for seg in data["segments"]])
                            print(f"Viewer RECEIVED TRANSCRIPTION: {text}")
                            if data.get("is_final"):
                                print("Final transcription received. Verification SUCCESS.")
                                break
                    except asyncio.TimeoutError:
                        print("Timed out waiting for transcription update.")
                        break
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_session_hub())
