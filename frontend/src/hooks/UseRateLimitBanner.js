import { useCallback, useEffect, useRef, useState } from "react";

export default function useRateLimitBanner(socket) {
  const [banner, setBanner] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const timeoutRef = useRef(null);
  const tickRef = useRef(null);

  const isRateLimited = Date.now() < cooldownUntil;
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  const handleErrorMessage = useCallback((error) => {
    const code = error?.code;
    const retryAfterMs = Number(error?.retryAfterMs);

    if (code?.startsWith("RATE_LIMIT") && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
      const until = Date.now() + retryAfterMs;

      setBanner(error?.message || "Liikaa viestejä.");
      setCooldownUntil(until);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setBanner(null);
        setCooldownUntil(0);
      }, retryAfterMs);

      return;
    }

    setBanner(error?.message || "Tapahtui virhe.");
  }, []);

  // Kuuntele backendin errorMessage tässä hookissa
  useEffect(() => {
    if (!socket) return;

    socket.on("errorMessage", handleErrorMessage);
    return () => socket.off("errorMessage", handleErrorMessage);
  }, [socket, handleErrorMessage]);

  // “tick” secondsLeftiä varten
  useEffect(() => {
    if (!cooldownUntil) return;

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setCooldownUntil((x) => x), 250);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [cooldownUntil]);

  // Cleanup unmountissa
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return { banner, isRateLimited, secondsLeft };
}
