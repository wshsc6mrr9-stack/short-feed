"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 元動画リスト（public/videos に置いたやつ）
  // ここは増やしたかったら追加してOK（例: 4.mp4, 5.mp4 ...）
  const baseVideos = useMemo(
    () => ["/videos/1.mp4", "/videos/2.mp4", "/videos/3.mp4"],
    []
  );

  // TikTokっぽい「フィード」：ここにどんどん追加していく
  const [feed, setFeed] = useState<string[]>(() => baseVideos.slice(0, 3));
  const [idx, setIdx] = useState(0);

  // 音（最初はミュートで開始）
  const [muted, setMuted] = useState(true);

  // スワイプ用
  const touchY = useRef<number | null>(null);
  const lock = useRef(false);

  // --- フィードを増やす（末尾が近づいたら追加） ---
  const addMore = () => {
    setFeed((f) => {
      // 10本追加（ランダムで回す）
      const more = Array.from({ length: 10 }, () => {
        const pick = baseVideos[Math.floor(Math.random() * baseVideos.length)];
        return pick;
      });
      return [...f, ...more];
    });
  };

  // idx が末尾に近いなら追加
  useEffect(() => {
    if (idx >= feed.length - 3) addMore();

    // メモリ増えすぎ防止：古いのを削る（TikTokも裏でやってる）
    // feedが80本超えて、ある程度進んだら前をカット
    if (feed.length > 80 && idx > 40) {
      setFeed((f) => f.slice(30));
      setIdx((v) => v - 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // --- idx が変わったら、動画を再生（ブラウザが許せば） ---
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // 状態に合わせてミュート反映
    v.muted = muted;
    v.volume = 1;

    // src差し替え後の再生トライ（失敗してもOK）
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [idx, muted]);

  // --- 次/前 ---
  const next = () => setIdx((v) => Math.min(v + 1, feed.length - 1));
  const prev = () => setIdx((v) => Math.max(v - 1, 0));

  // --- スワイプ処理（暴発防止 lock 付き） ---
  const swipe = (dir: "up" | "down") => {
    if (lock.current) return;
    lock.current = true;

    if (dir === "up") next();
    else prev();

    setTimeout(() => {
      lock.current = false;
    }, 250);
  };

  // --- 音ON（ユーザー操作の中で play() するのが超重要） ---
  const soundOn = async () => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = false;
    v.volume = 1;

    try {
      await v.play();
      setMuted(false);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div
      className="h-screen w-screen bg-black relative overflow-hidden"
      // スマホ：タッチ開始位置記録
      onTouchStart={(e) => {
        touchY.current = e.touches[0].clientY;
      }}
      // スマホ：タッチ終了で上下判定
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchY.current;
        touchY.current = null;

        // ちょい動いた程度は無視（誤爆防止）
        if (Math.abs(dy) < 60) return;

        // 上スワイプ = 次、下スワイプ = 前
        swipe(dy < 0 ? "up" : "down");
      }}
      // PC：ホイールでも上下
      onWheel={(e) => {
        if (Math.abs(e.deltaY) < 20) return;
        swipe(e.deltaY > 0 ? "up" : "down");
      }}
    >
      <video
        key={`${idx}-${feed[idx]}`} // 切替を確実にする
        ref={videoRef}
        src={feed[idx]}
        autoPlay
        playsInline
        muted={muted} // ここは state で管理
        loop // TikTokっぽくループ（自動で次に行かせたいなら loop消して onEnded={next} にしてOK）
        className="h-full w-full object-contain bg-black"

      />

      {/* 音ONボタン（ミュート中だけ表示） */}
      {muted && (
        <button
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-white/90 text-black font-bold"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            soundOn();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            soundOn();
          }}
        >
          タップで音ON
        </button>
      )}

      {/* デバッグ表示（いらんかったら消してOK） */}
      <div className="absolute top-3 left-3 text-white/70 text-xs">
        {idx + 1} / {feed.length}
      </div>
    </div>
  );
}
