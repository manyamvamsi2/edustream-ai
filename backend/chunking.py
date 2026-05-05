def chunk_transcript(transcript_result: dict, max_chunk_size: int = 1000) -> list:
    """
    Splits the transcription result into smaller chunks while preserving timestamps.
    `transcript_result` is expected to have a 'segments' list.
    """
    chunks = []
    current_chunk_text = ""
    current_chunk_start = None
    current_chunk_end = None

    for segment in transcript_result.get("segments", []):
        text = segment.get("text", "").strip()
        start = segment.get("start")
        end = segment.get("end")

        if not text:
            continue

        if current_chunk_start is None:
            current_chunk_start = start

        new_text = f"{current_chunk_text} {text}" if current_chunk_text else text

        if len(new_text) > max_chunk_size:
            # Save current chunk and start a new one
            if current_chunk_text:
                chunks.append({
                    "text": current_chunk_text.strip(),
                    "start": current_chunk_start,
                    "end": current_chunk_end
                })
            current_chunk_text = text
            current_chunk_start = start
            current_chunk_end = end
        else:
            # Continue building the chunk
            current_chunk_text = new_text
            current_chunk_end = end

    # Append the last chunk
    if current_chunk_text:
        chunks.append({
            "text": current_chunk_text.strip(),
            "start": current_chunk_start,
            "end": current_chunk_end
        })

    return chunks
