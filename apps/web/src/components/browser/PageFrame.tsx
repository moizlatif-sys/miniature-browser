'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildFrameDocument, randomHex, readFrameMessage, RestoreMessage } from '@/lib/renderer/frame-document';

interface Props {
  title: string;
  safeHtml: string;
  /** Where to put the reader when the page is ready: a saved scroll, else a fragment, else the top. */
  restoreY: number | null;
  fragment: string | null;
  onNavigate: (target: string) => void;
  onBlocked: (target: string) => void;
  onScroll: (y: number) => void;
}

/**
 * Renders one published page in a sandboxed iframe and talks to its bridge.
 * Mount a fresh PageFrame (via `key`) for every navigation entry, so each
 * frame instance has its own id and late messages from old frames are ignored.
 */
export function PageFrame({ title, safeHtml, restoreY, fragment, onNavigate, onBlocked, onScroll }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [{ frameId, nonce }] = useState(() => ({ frameId: randomHex(), nonce: randomHex() }));
  // Restore target is fixed at mount; later scroll updates must not re-trigger it.
  const [initial] = useState(() => ({ restoreY, fragment }));
  const handlers = useRef({ onNavigate, onBlocked, onScroll });
  handlers.current = { onNavigate, onBlocked, onScroll };

  const srcDoc = useMemo(() => buildFrameDocument(safeHtml, frameId, nonce), [safeHtml, frameId, nonce]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const win = iframe.current?.contentWindow;
      // A sandboxed frame's origin is "null", which proves nothing. Identity is
      // checked by window reference plus this frame instance's id.
      if (!win || event.source !== win) return;
      const msg = readFrameMessage(event.data, frameId);
      if (!msg) return;

      switch (msg.type) {
        case 'ready': {
          const restore: RestoreMessage = { type: 'restore', frameId, y: initial.restoreY, fragment: initial.fragment };
          // An opaque-origin frame cannot be addressed by origin, hence "*". The
          // message carries only a scroll position or fragment name.
          win.postMessage(restore, '*');
          break;
        }
        case 'scroll':
          handlers.current.onScroll(msg.y);
          break;
        case 'navigate':
          handlers.current.onNavigate(msg.target);
          break;
        case 'blocked':
          handlers.current.onBlocked(msg.target);
          break;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameId, initial]);

  return (
    <iframe
      ref={iframe}
      className="page-frame"
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
    />
  );
}
