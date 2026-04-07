import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 600);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <>
      <style>{`
        /* Use system font stack - avoids network dependency on splash */

        .splash-logo {
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .splash-logo.show {
          opacity: 1;
          transform: scale(1);
        }

        .splash-name {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s,
                      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
        }
        .splash-name.show {
          opacity: 1;
          transform: translateY(0);
        }

        .splash-credit {
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.5s ease 0.35s,
                      transform 0.5s ease 0.35s;
        }
        .splash-credit.show {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0a0b",
          transition: "opacity 0.6s ease",
          opacity: fadeOut ? 0 : 1,
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        {/* Subtle radial glow behind logo */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Center block: logo + name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {/* Logo */}
          <div className={`splash-logo ${visible ? "show" : ""}`}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px rgba(0,0,0,0.5)",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="./CUKLogo.ico"
                alt="CUK Acadex Logo"
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            </div>
          </div>

          {/* App name */}
          <div className={`splash-name ${visible ? "show" : ""}`} style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.4px",
                color: "#f1f1f1",
                margin: 0,
                lineHeight: 1,
              }}
            >
              CUK Acadex
            </p>
          </div>
        </div>

        {/* Bottom credit */}
        <div
          className={`splash-credit ${visible ? "show" : ""}`}
          style={{ position: "absolute", bottom: 48, textAlign: "center" }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", margin: "0 0 6px", fontWeight: 400, letterSpacing: "0.02em" }}>
            Developed by
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 2px", fontWeight: 500 }}>
            Milad Ajaz Bhat
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 500 }}>
            Nimra Wani
          </p>
        </div>
      </div>
    </>
  );
};