import { useEffect, useRef, useState } from "react";

export default function useFocusTimer() {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const next = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        setComplete(true);
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [running]);
  const reset = (value = minutes) => {
    setRunning(false);
    setComplete(false);
    setMinutes(value);
    setRemaining(value * 60);
  };
  const toggle = () => {
    if (running) {
      setRemaining(
        Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
      );
      setRunning(false);
    } else {
      const seconds = remaining || minutes * 60;
      setRemaining(seconds);
      setComplete(false);
      deadline.current = Date.now() + seconds * 1000;
      setRunning(true);
    }
  };
  return {
    minutes,
    remaining,
    running,
    complete,
    reset,
    toggle,
    time: `${Math.floor(remaining / 60)
      .toString()
      .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`,
  };
}
