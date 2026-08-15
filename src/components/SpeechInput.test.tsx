/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechInput } from "./SpeechInput";

type Handlers = {
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function installSpeechMock() {
  const instances: Array<Handlers & { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; abort: ReturnType<typeof vi.fn> }> = [];
  class FakeSpeechRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: Handlers["onresult"] = null;
    onend: Handlers["onend"] = null;
    onerror: Handlers["onerror"] = null;
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
    constructor() {
      instances.push(this);
    }
  }
  (
    window as unknown as { SpeechRecognition: typeof FakeSpeechRecognition }
  ).SpeechRecognition = FakeSpeechRecognition;
  return instances;
}

describe("useSpeechInput", () => {
  beforeEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports unsupported when SpeechRecognition is missing", () => {
    const { result } = renderHook(() => useSpeechInput(vi.fn()));
    expect(result.current.supported).toBe(false);
  });

  it("starts listening and forwards transcripts", () => {
    const instances = installSpeechMock();
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useSpeechInput(onTranscript));

    expect(result.current.supported).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.listening).toBe(true);
    expect(instances[0].start).toHaveBeenCalled();

    act(() => {
      instances[0].onresult?.({
        results: { length: 1, 0: { 0: { transcript: "two eggs" }, isFinal: true } },
      });
    });
    expect(onTranscript).toHaveBeenCalledWith("two eggs");
  });

  it("surfaces not-allowed errors and ignores aborted", () => {
    const instances = installSpeechMock();
    const { result } = renderHook(() => useSpeechInput(vi.fn()));
    act(() => result.current.toggle());

    act(() => {
      instances[0].onerror?.({ error: "aborted" });
    });
    expect(result.current.error).toBeNull();

    act(() => result.current.toggle());
    act(() => {
      instances[1].onerror?.({ error: "not-allowed" });
    });
    expect(result.current.error).toMatch(/Microphone access denied/i);
  });

  it("aborts recognition on unmount", () => {
    const instances = installSpeechMock();
    const { result, unmount } = renderHook(() => useSpeechInput(vi.fn()));
    act(() => result.current.toggle());
    unmount();
    expect(instances[0].abort).toHaveBeenCalled();
  });
});
